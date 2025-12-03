'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

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
    // 1. Generate Story Script
    const scriptResponse = await ai.generate({
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The output must be 2-4 sentences long and include a clear, strange visual description. Use a dramatic, high-energy tone. Prompt: ${prompt}`,
    });
    const script = scriptResponse.text;
    if (!script) {
        return { error: 'Failed to generate story script.' };
    }

    // 2. Generate Visual and Voiceover in Parallel
    const [visualResult, voiceoverResult] = await Promise.allSettled([
      // Generate Cinematic Visual
      ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd scene: ${script}`,
        config: {
          aspectRatio: "16:9",
        }
      }),
      // Generate Dramatic Voiceover
      ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zubenelgenubi' },
            },
          },
        },
        prompt: `Narrate this script with a deep, dramatic, and slightly ominous cinematic voice: ${script}`,
      })
    ]);

    // 3. Process Visual Result
    let visualDataUri: string;
    if (visualResult.status === 'fulfilled' && visualResult.value.media.url) {
      visualDataUri = visualResult.value.media.url;
    } else {
      const reason = visualResult.status === 'rejected' ? visualResult.reason.message : 'Visual generation result was empty.';
      console.error('Visual generation failed:', reason);
      return { error: `Failed to generate cinematic visual: ${reason}` };
    }

    // 4. Process Voiceover Result
    let voiceoverMedia: string;
    if (voiceoverResult.status === 'fulfilled' && voiceoverResult.value.media.url) {
      const audioBuffer = Buffer.from(
        voiceoverResult.value.media.url.substring(voiceoverResult.value.media.url.indexOf(',') + 1),
        'base64'
      );
      voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    } else {
      const reason = voiceoverResult.status === 'rejected' ? voiceoverResult.reason.message : 'Voiceover generation result was empty.';
      console.error('Voiceover generation failed:', reason);
      return { error: `Failed to generate voiceover: ${reason}` };
    }
    
    return {
      script,
      visualDataUri,
      voiceoverMedia,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    return { error: e.message || 'An unexpected error occurred during generation. Please try again later.' };
  }
}
