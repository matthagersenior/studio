'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type GenerationResult = {
  script: string;
  visualUrl: string;
  voiceoverMedia: string;
  audioDuration: number;
  error?: never;
} | {
  script?: never;
  visualUrl?: never;
  voiceoverMedia?: never;
  audioDuration?: never;
  error: string;
};


export async function generateStory(prompt: string): Promise<GenerationResult> {
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

    // 2. Generate Video and Voiceover in Parallel
    const videoPromise = ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${script}`,
        config: {
            durationSeconds: 8, // Veo can generate between 5-8s
            aspectRatio: '16:9',
        },
    });

    const voiceoverPromise = ai.generate({
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
      });

    const [voiceoverResult, videoOpResult] = await Promise.allSettled([
      voiceoverPromise,
      videoPromise,
    ]);

    // 3. Process Voiceover Result
    let voiceoverMedia: string;
    let audioBuffer: Buffer;
    if (voiceoverResult.status === 'fulfilled' && voiceoverResult.value.media.url) {
      audioBuffer = Buffer.from(
        voiceoverResult.value.media.url.substring(voiceoverResult.value.media.url.indexOf(',') + 1),
        'base64'
      );
      voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    } else {
      const reason = voiceoverResult.status === 'rejected' ? (voiceoverResult.reason as Error).message : 'Voiceover generation result was empty.';
      console.error('Voiceover generation failed:', reason);
      return { error: `Failed to generate voiceover: ${reason}` };
    }

    // 4. Process Video Result (Polling)
    let visualUrl: string;
    if (videoOpResult.status === 'fulfilled' && videoOpResult.value.operation) {
        let operation = videoOpResult.value.operation;
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before checking again
            operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const video = operation.output?.message?.content.find(p => !!p.media);
        if (!video || !video.media?.url) {
            throw new Error('Failed to find the generated video in operation result.');
        }
        visualUrl = video.media.url;

    } else {
        const reason = videoOpResult.status === 'rejected' ? (videoOpResult.reason as Error).message : 'Video generation operation did not start.';
        console.error('Video generation failed:', reason);
        throw new Error(reason);
    }
    

    // 5. Calculate audio duration
    const sampleRate = 24000; // As per the model's output
    const bitDepth = 16; // PCM16
    const channels = 1; // Mono
    const audioDuration = audioBuffer.length / (sampleRate * (bitDepth / 8) * channels);

    return {
      script: script.replace(/---/g, '\n\n'),
      visualUrl,
      voiceoverMedia,
      audioDuration,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    return { error: e.message || 'An unexpected error occurred during generation. Please try again later.' };
  }
}
