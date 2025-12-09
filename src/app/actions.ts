'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type GenerationResult = {
  script: string;
  visualUrls: string[];
  voiceoverMedia: string;
  audioDuration: number;
  error?: never;
} | {
  script?: never;
  visualUrls?: never;
  voiceoverMedia?: never;
  audioDuration?: never;
  error: string;
};


export async function generateStory(prompt: string): Promise<GenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // 1. Generate Story Script with 3 scenes
    const scriptResponse = await ai.generate({
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. CRUCIALLY, the story MUST be broken into exactly 3 distinct scenes. Use a scene separator like '---' between each scene. Each scene must have a clear visual description. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Prompt: ${prompt}`,
    });
    const script = scriptResponse.text;
    if (!script) {
        return { error: 'Failed to generate story script.' };
    }

    const scenes = script.split('---').map(s => s.trim()).filter(Boolean);
    if (scenes.length < 1) {
        return { error: 'Could not parse scenes from the generated script.' };
    }

    // 2. Generate Visuals and Voiceover in Parallel
    const visualPromises = scenes.map(scene => 
      ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd scene: ${scene}`,
      })
    );

    const [voiceoverResult, ...visualResults] = await Promise.allSettled([
      // Generate Dramatic Voiceover for the whole script
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
        prompt: `Narrate this script with a deep, dramatic, and slightly ominous cinematic voice: ${script.replace(/---/g, ' ')}`,
      }),
      ...visualPromises
    ]);

    // 3. Process Visual Results
    const visualUrls = visualResults.map((result, index) => {
        if (result.status === 'fulfilled' && result.value.media.url) {
            return result.value.media.url;
        } else {
            const reason = result.status === 'rejected' ? result.reason.message : `Image generation for scene ${index + 1} was empty.`;
            console.error(`Image generation for scene ${index + 1} failed:`, reason);
            throw new Error(reason);
        }
    });

    // 4. Process Voiceover Result
    let voiceoverMedia: string;
    let audioBuffer: Buffer;
    if (voiceoverResult.status === 'fulfilled' && voiceoverResult.value.media.url) {
      audioBuffer = Buffer.from(
        voiceoverResult.value.media.url.substring(voiceoverResult.value.media.url.indexOf(',') + 1),
        'base64'
      );
      voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    } else {
      const reason = voiceoverResult.status === 'rejected' ? voiceoverResult.reason.message : 'Voiceover generation result was empty.';
      console.error('Voiceover generation failed:', reason);
      return { error: `Failed to generate voiceover: ${reason}` };
    }
    
    const sampleRate = 24000;
    const bitDepth = 16;
    const channels = 1;
    const audioDuration = audioBuffer.length / (sampleRate * (bitDepth / 8) * channels);

    return {
      script: script.replace(/---/g, '\n\n'),
      visualUrls,
      voiceoverMedia,
      audioDuration,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    return { error: e.message || 'An unexpected error occurred during generation. Please try again later.' };
  }
}
