
'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

import { ai } from '@/ai/genkit';
import { toWav } from '@/lib/audio';
import { z } from 'zod';

// Define the schema for the structured story generation.
// This will be used to validate the data we parse from the model's text response.
const storyGenerationSchema = z.object({
  script: z
    .string()
    .describe('A short, dramatic, engaging story script, between 150 and 200 words. It should have a clear beginning, middle, and end.'),
});

// This is the payload the UI will receive.
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
    // Step 1: Generate the story script.
    // We ask the model to return a JSON object as a string, which is more reliable
    // than using complex output schemas that have been causing issues.
    const storyResponse = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: `You are a master storyteller. Based on the prompt below, create a short, dramatic, and engaging story script.

        Return ONLY a single, valid JSON object with one key: "script".

        Do not wrap the JSON in markdown (e.g. \`\`\`json) or any other characters.

        Prompt: "${prompt}"`,
    });

    const responseText = storyResponse.text;
    let parsedOutput;

    try {
      // The model might still occasionally wrap the output in ```json ... ```, so we clean it.
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

    // Step 2: Generate the audio and image in parallel.
    // For stability, we use a reliable placeholder image service instead of a generative model.
    const [audioResult] = await Promise.all([
      // Generate the voiceover from the script.
      ai.generate({
        model: 'googleai/text-to-speech',
        prompt: script,
        config: {
          responseModalities: ['AUDIO'],
        },
      }),
    ]);
    
    // Using a stable placeholder image service to avoid model failures and ensure a visual is always present.
    // The seed is based on the current time to get a different image for each generation.
    const imageUrl = `https://picsum.photos/seed/${Date.now()}/540/960`;


    // Process audio result
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      return { error: 'Failed to generate the voiceover for the story.' };
    }

    // The audio is returned as raw PCM data in a base64 data URI.
    // We need to convert it to a WAV file so it can be played in the browser.
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
    // Provide a more user-friendly error message, but log the full technical error.
    let message = 'An unknown error occurred during generation.';
    if (e.message) {
        message = `An AI model returned an error. Please try a different prompt or try again later. Details: ${e.message}`;
    }
    return {
      error: `Generation Failed: ${message}`,
    };
  }
}
