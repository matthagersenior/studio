
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  imageUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

const StoryOutputSchema = z.object({
    script: z.string().describe("A short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions."),
    imagePrompt: z.string().describe("A prompt for an image generator like DALL-E or Imagen that would generate a cinematic, surreal, and slightly cursed image to accompany the script."),
});


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // STAGE 1: Generate script and image prompt in a single, efficient call.
    const initialResponse = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a script for a short video and a prompt for an image generator like Imagen.

        User Prompt: ${prompt}
        
        The script should be a very short, absurd, single-paragraph story. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses.
        
        The image prompt should describe a visual that is cinematic, surreal, and slightly cursed to accompany the script.`,
        output: {
          schema: StoryOutputSchema,
        },
    });

    let { script, imagePrompt } = initialResponse.output || {};

    if (!script || !imagePrompt) {
        throw new Error('Failed to generate script and image prompt from the initial AI call.');
    }
    
    // Clean up any stray markdown or parentheticals the model might add.
    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();

    // STAGE 2: Generate audio and image in PARALLEL for maximum efficiency.
    const [audioResult, imageResult] = await Promise.all([
      // Audio Generation
      ai.generate({
          model: googleAI.model('gemini-2.5-flash-preview-tts'),
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Algenib' },
              },
            },
          },
          prompt: script,
      }),
      // Image Generation
      ai.generate({
          model: googleAI.model('imagen'),
          prompt: imagePrompt,
      })
    ]);

    // Process Audio
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      throw new Error('The voiceover generation step failed to produce audio.');
    }
    const audioBuffer = Buffer.from(audioMedia.url.substring(audioMedia.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;
    
    // Process Image
    const imageMedia = imageResult.media;
    if (!imageMedia?.url) {
      throw new Error('The image generation step failed to produce a visual.');
    }

    // STAGE 3: Return the complete, successful payload.
    return {
      script,
      audioUrl,
      imageUrl: imageMedia.url,
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';

    if (String(e).includes('404') || String(e).includes('model is currently unavailable')) {
      errorMessage = 'An underlying AI model is currently unavailable. Please try again later.';
    } else if (String(e).includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (String(e).includes('429') || String(e).includes('Too Many Requests') || String(e).includes('quota') || String(e).includes('resource has been exhausted')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    } else if (String(e).includes('INVALID_ARGUMENT')) {
        errorMessage = `A technical error occurred during generation: ${e.message}`;
    }

    return { error: errorMessage };
  }
}
