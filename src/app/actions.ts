'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

import {genkit, ai} from '@/ai/genkit';
import {toWav} from '@/lib/audio';
import {z} from 'zod';

// Define the schema for the story script generation prompt.
const storyScriptSchema = z.object({
  script: z
    .string()
    .describe('A short, dramatic, engaging story script, between 150 and 200 words. It should have a clear beginning, middle, and end.'),
});

// Define the prompt for generating the story script.
const generateStoryPrompt = ai.definePrompt({
  name: 'generateStoryPrompt',
  input: {
    schema: z.object({
      prompt: z.string(),
    }),
  },
  output: {
    schema: storyScriptSchema,
  },
  prompt: `You are a master storyteller. Create a short, dramatic, and engaging story based on the following prompt. The story should be between 150 and 200 words and have a clear narrative arc.

Prompt: {{{prompt}}}`,
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
    return {error: 'Prompt cannot be empty.'};
  }

  try {
    // Step 1: Generate the story script.
    const storyResponse = await generateStoryPrompt({prompt});
    const {script} = storyResponse;

    if (!script) {
      return {error: 'Failed to generate a story script.'};
    }

    // Step 2: Generate the visual and audio in parallel.
    const [imageResult, audioResult] = await Promise.all([
      // Generate the cinematic visual.
      ai.generate({
        model: 'googleai/imagen-2',
        prompt: `Create a single, highly detailed, cinematic, and dramatic image that visually represents the following story. Focus on a key moment or the overall mood of the narrative. Avoid text or overlays.

Story:
${script}`,
        config: {
          aspectRatio: '9:16',
        },
      }),
      // Generate the voiceover.
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
      return {error: 'Failed to generate a visual.'};
    }

    // Process audio result
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      return {error: 'Failed to generate a voiceover.'};
    }

    // The audio is returned as PCM data in a base64 data URI.
    // We need to convert it to a WAV file to be playable in the browser.
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
    console.error(e);
    // Provide a more user-friendly error message.
    const message =
      e.message?.includes('FETCH_ERROR') || e.message?.includes('Not Found')
        ? 'An underlying AI model is currently unavailable. Please try again later.'
        : e.message || 'An unknown error occurred.';
    return {
      error: message,
    };
  }
}
