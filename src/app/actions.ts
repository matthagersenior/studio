'use server';

import { generateCinematicVisual } from "@/ai/flows/generate-cinematic-visual";
import { generateDramaticVoiceover } from "@/ai/flows/generate-dramatic-voiceover";
import { generateStoryScript } from "@/ai/flows/generate-story-script";

export type GenerationResult = {
  script: string;
  visualDataUri: string;
  voiceoverMedia: string;
  error?: never;
} | {
  script?: never;
  visualDataUri?: never;
  voiceoverMedia?: never;
  error: string;
};


export async function generateStory(prompt: string): Promise<GenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const { script } = await generateStoryScript({ prompt });

    if (!script) {
        return { error: 'Failed to generate story script.' };
    }

    const [visualResult, voiceoverResult] = await Promise.all([
      generateCinematicVisual({ storyScript: script }),
      generateDramaticVoiceover({ script: script }),
    ]);

    if (!visualResult.visualDataUri) {
        return { error: 'Failed to generate cinematic visual.' };
    }

    if (!voiceoverResult.media) {
        return { error: 'Failed to generate voiceover.' };
    }

    return {
      script,
      visualDataUri: visualResult.visualDataUri,
      voiceoverMedia: voiceoverResult.media,
    };
  } catch (e) {
    console.error('Story generation failed:', e);
    return { error: 'An unexpected error occurred during generation. Please try again later.' };
  }
}
