
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
  imagePrompt: z
    .string()
    .describe(
      'A detailed, cinematic, and dramatic prompt for an AI image generator that visually represents the story. Focus on a key moment or the overall mood. Do not include text or overlays in the description.'
    ),
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
    // Step 1: Generate the story script and the image prompt in a single, reliable call.
    // We ask for a JSON object within a simple text prompt to avoid complex Genkit features that were failing.
    const storyResponse = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      prompt: `You are a master storyteller. Based on the prompt below, create a short, dramatic, and engaging story script. Also, create a detailed, cinematic prompt for an AI image generator to create a visual for this story.

Return ONLY a single, valid JSON object with two keys: "script" and "imagePrompt".

Do not wrap the JSON in markdown or any other characters.

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

    const { script, imagePrompt } = parsedOutput;

    if (!script || !imagePrompt) {
      return { error: 'Failed to generate a valid story script or image prompt.' };
    }

    // Step 2: Generate the visual and audio in parallel for performance.
    const [imageResult, audioResult] = await Promise.all([
      // Generate the cinematic visual using the prompt from Step 1.
      ai.generate({
        model: 'googleai/imagen-2',
        prompt: imagePrompt,
        config: {
          aspectRatio: '9:16',
        },
      }),
      // Generate the voiceover from the script.
      ai.generate({
        model: 'googleai/text-to-speech',
        prompt: script,
        config: {
          responseModalities: ['AUDIO'],
        },
      }),
    ]);

    // Process image result
    const imageUrl = imageResult.media.url;
    if (!imageUrl) {
      return { error: 'Failed to generate the visual for the story.' };
    }

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
      if (e.message.includes('v1beta')) {
        message = `An AI model required by the application is not available. This is a configuration issue. (Details: ${e.message})`;
      } else if (e.message.includes('404') || e.message.includes('Not Found')) {
        message = `An AI model could not be found. Please check the model names. Details: ${e.message}`;
      } else if (e.message.includes('400') || e.message.includes('Bad Request')) {
        message = `The request to the AI model was invalid. This may be a syntax error in the prompt. Details: ${e.message}`;
      } else {
        message = e.message;
      }
    }
    return {
      error: `Generation Failed: ${message}`,
    };
  }
}
