'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type GenerationResult = {
  script: string;
  imageUrl: string;
  voiceoverMedia: string;
  audioDuration: number;
  generationTime: number;
  error?: never;
} | {
  script?: never;
  imageUrl?: never;
  voiceoverMedia?: never;
  audioDuration?: never;
  generationTime?: never;
  error: string;
};


export async function generateStory(prompt: string): Promise<GenerationResult> {
  const startTime = Date.now();

  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // 1. Generate Story Script 
    const scriptResponse = await ai.generate({
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Prompt: ${prompt}`,
    });
    const script = scriptResponse.text;
    if (!script) {
        return { error: 'Failed to generate story script.' };
    }

    // 2. Generate Image and Voiceover in Parallel
    const [imageResult, voiceoverResult] = await Promise.allSettled([
      // Generate Image
      ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${script}`,
      }),
      // Generate Voiceover
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

    // 3. Process results
    let imageUrl: string;
    if (imageResult.status === 'fulfilled' && imageResult.value.media.url) {
      imageUrl = imageResult.value.media.url;
    } else {
      const reason = imageResult.status === 'rejected' ? imageResult.reason.message : 'Image generation result was empty.';
      console.error('Image generation failed:', reason);
      throw new Error(`Failed to generate visual. Reason: ${reason}`);
    }

    let voiceoverMedia: string;
    let audioDuration: number;
    if (voiceoverResult.status === 'fulfilled' && voiceoverResult.value.media.url) {
      const audioBuffer = Buffer.from(
        voiceoverResult.value.media.url.substring(voiceoverResult.value.media.url.indexOf(',') + 1),
        'base64'
      );
      voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
      
      const sampleRate = 24000;
      const bitDepth = 16;
      const channels = 1;
      audioDuration = audioBuffer.length / (sampleRate * (bitDepth / 8) * channels);
    } else {
      const reason = voiceoverResult.status === 'rejected' ? voiceoverResult.reason.message : 'Voiceover generation result was empty.';
      console.error('Voiceover generation failed:', reason);
      throw new Error(`Failed to generate voiceover. Reason: ${reason}`);
    }
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;

    return {
      script: script.replace(/---/g, '\n\n'),
      imageUrl,
      voiceoverMedia,
      audioDuration,
      generationTime,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (errorMessage.includes('429')) {
        return { error: "We're experiencing high demand right now. Please wait a moment and try again." };
    }

    return { error: errorMessage };
  }
}
