
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  imageUrl: string; // Will be a static GIF URL
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

const ScriptOutputSchema = z.object({
    script: z.string().describe("A short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions. The language should be deliberately exaggerated and contain elements of internet culture. Use a dramatic, high-energy tone."),
});


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Generate script and audio in parallel. The image is now static.
    const [scriptResult] = await Promise.all([
      ai.generate({
          model: googleAI.model('gemini-1.5-flash'),
          prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a script for a short video.
  
          User Prompt: ${prompt}`,
          output: {
            schema: ScriptOutputSchema,
          },
      }),
    ]);
    
    let { script } = scriptResult.output || {};

    if (!script) {
        throw new Error('Failed to generate a script.');
    }
    
    // Clean up any stray markdown or parentheticals the model might add.
    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();

    // Now generate the audio from the cleaned script
    const audioResult = await ai.generate({
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
    });

    // Process Audio
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      throw new Error('The voiceover generation step failed to produce audio.');
    }
    const audioBuffer = Buffer.from(audioMedia.url.substring(audioMedia.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;
    
    // The visual is now a static, reliable GIF.
    const imageUrl = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif";

    // STAGE 3: Return the complete, successful payload.
    return {
      script,
      audioUrl,
      imageUrl,
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
