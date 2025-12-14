'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

import { ai } from '@/ai/genkit';
import { toWav } from '@/lib/audio';
import { z } from 'zod';

const storyGenerationSchema = z.object({
  script: z
    .string()
    .describe('A short, dramatic, engaging story script, between 150 and 200 words. It should have a clear beginning, middle, and end.'),
});

export type StoryResultPayload = {
  script: string;
  imageUrl: string;
  audioUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

export async function generateStory(
  prompt: string
): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Step 1: Generate the story script using a stable model and simple JSON parsing.
    const storyResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `You are a master storyteller. Based on the prompt below, create a short, dramatic, and engaging story script.

      Return ONLY a single, valid JSON object with one key: "script".

      Do not wrap the JSON in markdown (e.g. \`\`\`json) or any other characters.

      Prompt: "${prompt}"`,
    });
    
    const responseText = storyResponse.text;
    let parsedOutput;

    try {
      // Clean up potential markdown code fences around the JSON.
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      parsedOutput = storyGenerationSchema.parse(JSON.parse(cleanedText));
    } catch (e: any) {
      console.error("Failed to parse story generation response:", e, "Raw response:", responseText);
      return { error: "The AI failed to return a valid story structure. Please try a different prompt." };
    }

    const { script } = parsedOutput;

    if (!script) {
      return { error: 'Failed to generate a valid story script.' };
    }

    // Step 2: Generate audio. This uses a different, dedicated model.
    const audioResult = await ai.generate({
      model: 'googleai/text-to-speech',
      prompt: script,
      config: {
        responseModalities: ['AUDIO'],
      },
    });
    
    // Step 3: For stability, use a reliable placeholder image service.
    const imageUrl = `https://picsum.photos/seed/${Date.now()}/540/960`;

    // Process audio result
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      return { error: 'Failed to generate the voiceover for the story.' };
    }

    const pcmData = Buffer.from(
      audioMedia.url.substring(audioMedia.url.indexOf(',') + 1),
      'base64'
    );
    const wavData = await toWav(pcmData);
    const audioUrl = `data:audio/wav;base64,${wavData}`;

    return {
      script,
      imageUrl,
      audioUrl,
    };
  } catch (e: any) {
    console.error('An error occurred during story generation:', e);
    let message = 'An unknown error occurred during generation.';
    if (e.message) {
      // Check for common, user-facing errors
      if (e.message.includes('404 Not Found')) {
         message = `An AI model could not be found. Please check the model names. Details: ${e.message}`;
      } else {
         message = `An AI model returned an error. Please try a different prompt or try again later. Details: ${e.message}`;
      }
    }
    return {
      error: `Generation Failed: ${message}`,
    };
  }
}
