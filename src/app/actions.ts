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
    const scriptResult = await generateStoryScript({ prompt });

    if (!scriptResult || !scriptResult.script) {
        return { error: 'Failed to generate story script. The result was empty.' };
    }
    const script = scriptResult.script;

    const [visualResult, voiceoverResult] = await Promise.allSettled([
      generateCinematicVisual({ storyScript: script }),
      generateDramaticVoiceover({ script: script }),
    ]);

    if (visualResult.status === 'rejected' || !visualResult.value.visualDataUri) {
        const reason = visualResult.status === 'rejected' ? visualResult.reason.message : 'The result was empty.';
        console.error('Visual generation failed:', reason);
        return { error: `Failed to generate cinematic visual: ${reason}` };
    }

    if (voiceoverResult.status === 'rejected' || !voiceoverResult.value.media) {
        const reason = voiceoverResult.status === 'rejected' ? voiceoverResult.reason.message : 'The result was empty.';
        console.error('Voiceover generation failed:', reason);
        return { error: `Failed to generate voiceover: ${reason}` };
    }

    return {
      script,
      visualDataUri: visualResult.value.visualDataUri,
      voiceoverMedia: voiceoverResult.value.media,
    };
  } catch (e: any) {
    console.error('Story generation failed:', e);
    return { error: e.message || 'An unexpected error occurred during generation. Please try again later.' };
  }
}
