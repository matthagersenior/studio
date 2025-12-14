
'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {toWav} from '@/lib/audio';

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

const GenerateStoryInputSchema = z.object({
  prompt: z.string().min(10).max(500),
});

const GenerateStoryOutputSchema = z.object({
  script: z
    .string()
    .describe('A short, dramatic, slightly absurd, and cringey script.'),
  imagePrompt: z
    .string()
    .describe(
      'A detailed, dramatic, cinematic prompt for an image generation model, based on the script.'
    ),
});

const generateStoryPrompt = ai.definePrompt({
  name: 'generateStoryPrompt',
  input: {schema: GenerateStoryInputSchema},
  output: {schema: GenerateStoryOutputSchema},
  model: 'googleai/gemini-pro',
  prompt: `
    You are a creative writer who specializes in creating short, dramatic, and slightly absurd "brain rot" style story scripts.
    Based on the user's prompt, create a script that is cringey, dramatic, and meme-worthy.
    Also, create a detailed, dramatic, and cinematic prompt for an image generation model that captures the essence of the story.

    User prompt: {{{prompt}}}
  `,
});

async function generateScriptAndImagePrompt(prompt: string) {
  const {output} = await generateStoryPrompt({prompt});
  if (!output) {
    throw new Error('Failed to generate script and image prompt.');
  }
  return output;
}

async function generateImage(imagePrompt: string) {
  const {media} = await ai.generate({
    model: 'googleai/imagen-2',
    prompt: imagePrompt,
  });

  const imageUrl = media.url;
  if (!imageUrl) {
    throw new Error('Failed to generate image.');
  }
  return imageUrl;
}

async function generateVoiceover(script: string) {
  const {media} = await ai.generate({
    model: 'googleai/text-to-speech',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {voiceName: 'Algenib'},
        },
      },
    },
    prompt: script,
  });

  if (!media) {
    throw new Error('Failed to generate audio.');
  }

  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );
  const audioBase64 = await toWav(audioBuffer);

  return `data:audio/wav;base64,${audioBase64}`;
}

export async function generateStory(
  prompt: string
): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return {error: 'Prompt cannot be empty.'};
  }

  try {
    // Stage 1: Generate Script and Image Prompt
    const {script, imagePrompt} = await generateScriptAndImagePrompt(prompt);

    // Stage 2: Generate Image and Voiceover in Parallel
    const [imageUrl, audioUrl] = await Promise.all([
      generateImage(imagePrompt),
      generateVoiceover(script),
    ]);

    return {
      script,
      imageUrl,
      audioUrl,
    };
  } catch (err: any) {
    console.error('Story generation failed:', err);
    // Provide a more specific error if available
    const message =
      err.cause?.message ||
      err.message ||
      'An underlying AI model is currently unavailable. Please try again later.';
    return {
      error: message,
    };
  }
}
