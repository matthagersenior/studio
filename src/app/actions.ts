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

    // 2. Generate Voiceover and determine its duration first
    const voiceoverResult = await ai.generate({
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

    let voiceoverMedia: string;
    let audioBuffer: Buffer;
    let audioDuration: number;

    if (voiceoverResult.media.url) {
        audioBuffer = Buffer.from(
            voiceoverResult.media.url.substring(voiceoverResult.media.url.indexOf(',') + 1),
            'base64'
        );
        voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
        
        // Calculate audio duration
        const sampleRate = 24000; // As per the model's output
        const bitDepth = 16; // PCM16
        const channels = 1; // Mono
        audioDuration = audioBuffer.length / (sampleRate * (bitDepth / 8) * channels);

    } else {
        console.error('Voiceover generation failed: result was empty.');
        return { error: `Failed to generate voiceover.` };
    }

    // 3. Generate Video with optimized duration
    // Veo supports 5-8 seconds. Let's clamp the duration.
    const videoDuration = Math.max(5, Math.min(8, Math.ceil(audioDuration)));

    const videoOpResult = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${script}`,
        config: {
            durationSeconds: videoDuration,
            aspectRatio: '16:9',
        },
    });


    // 4. Process Video Result (Polling)
    let visualUrl: string;
    if (videoOpResult.operation) {
        let operation = videoOpResult.operation;
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
        const reason = 'Video generation operation did not start.';
        console.error('Video generation failed:', reason);
        throw new Error(reason);
    }
    
    return {
      script: script.replace(/---/g, '\n\n'),
      visualUrl,
      voiceoverMedia,
      audioDuration,
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
