
'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

import {genkit, ai} from '@/ai/genkit';
import {toWav} from '@/lib/audio';
import {z} from 'zod';

// Define the schema for the structured story generation prompt.
// This will generate the script and a prompt for the image generation.
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

// Define the prompt for generating the story and image prompt.
const generateStoryAndImagePrompt = ai.definePrompt({
  name: 'generateStoryAndImagePrompt',
  input: {
    schema: z.object({
      prompt: z.string(),
    }),
  },
  prompt: `You are a master storyteller. Create a short, dramatic, and engaging story based on the following prompt. The story should be between 150 and 200 words and have a clear narrative arc. Also, create a detailed prompt for an AI image generator to create a visual for this story.

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
    // Step 1: Generate the story script and the image prompt in a single call.
    const storyResponse = await generateStoryAndImagePrompt(
      {prompt},
      {
        model: 'googleai/gemini-1.5-pro',
        output: {
          schema: storyGenerationSchema,
        },
      }
    );

    const {script, imagePrompt} = storyResponse;

    if (!script || !imagePrompt) {
      return {error: 'Failed to generate a story script or image prompt.'};
    }

    // Step 2: Generate the visual and audio in parallel.
    const [imageResult, audioResult] = await Promise.all([
      // Generate the cinematic visual using the prompt from Step 1.
      ai.generate({
        model: 'googleai/imagen-2',
        prompt: imagePrompt,
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
    console.error('Full error in generateStory:', e);
    
    // Provide a more user-friendly error message, but log the full error.
    let message = 'An unknown error occurred during generation.';
    if (e.message) {
        if (e.message.includes('v1beta')) {
             message = `An AI model required by the application is not available. Please try again later. (Details: ${e.message})`;
        } else if (e.message.includes('FETCH_ERROR') || e.message.includes('Not Found') || e.message.includes('Bad Request')) {
            message = `An AI model returned an error. Please try a different prompt or try again later. Details: ${e.message}`;
        } else {
            message = e.message;
        }
    }
    
    return {
      error: message,
    };
  }
}
