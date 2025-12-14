
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  visualUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

// Define the schema for the structured response from the main AI call
const StoryGenSchema = z.object({
  script: z.string().describe("The short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions."),
  imagePrompt: z.string().describe("A prompt for an image generation model, creating a cinematic, surreal, meme-worthy image for the script."),
});


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // 1. Generate script and image prompt in a single, structured call.
    const structuredResponse = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a JSON object containing a 'script' and an 'imagePrompt'. The script should be a very short, absurd, single-paragraph story. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses. The imagePrompt should be a descriptive prompt for an image generation model to create a cinematic, surreal, meme-worthy image representing the script. User Prompt: ${prompt}`,
      output: {
        schema: StoryGenSchema,
      },
    });
    
    const storyData = structuredResponse.output;

    if (!storyData || !storyData.script || !storyData.imagePrompt) {
      throw new Error('Failed to generate structured story data.');
    }

    let script = storyData.script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

    // 2. Generate image and audio in parallel using the structured data.
    const [imageResponse, audioResponse] = await Promise.all([
      ai.generate({
        model: googleAI.model('imagen-4.0-fast-generate-001'),
        prompt: storyData.imagePrompt,
      }),
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
      })
    ]);
    
    const visualMedia = imageResponse.media;
    if (!visualMedia?.url) {
        throw new Error('Failed to generate visual.');
    }
    const visualUrl = visualMedia.url;

    const audioMedia = audioResponse.media;
    if (!audioMedia?.url) {
      throw new Error('Failed to generate voiceover.');
    }
  
    const audioBuffer = Buffer.from(
      audioMedia.url.substring(audioMedia.url.indexOf(',') + 1),
      'base64'
    );
  
    const wavBase64 = await toWav(audioBuffer);
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    return { 
      script,
      audioUrl,
      visualUrl,
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (String(e.message).includes('404')) {
      errorMessage = 'An underlying AI model is currently unavailable. Please try again later.';
    } else if (String(e.message).includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (String(e.message).includes('429') || String(e.message).includes('Too Many Requests') || String(e.message).includes('quota') || String(e.message).includes('resource has been exhausted')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    } else if (String(e.message).includes('INVALID_ARGUMENT')) {
        errorMessage = `A technical error occurred during generation: ${e.message}`;
    }
    
    return { error: errorMessage };
  }
}
