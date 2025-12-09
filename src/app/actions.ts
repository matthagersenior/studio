'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type WordTimestamp = {
  word: string;
  startSeconds: number;
  endSeconds: number;
};

export type GenerationResult = {
  script: string;
  videoUrl: string;
  voiceoverMedia: string;
  audioDuration: number;
  timestamps: WordTimestamp[];
  error?: never;
} | {
  script?: never;
  videoUrl?: never;
  voiceoverMedia?: never;
  audioDuration?: never;
  timestamps?: never;
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
    let script = scriptResponse.text;
    if (!script) {
        return { error: 'Failed to generate story script.' };
    }
    
    const voiceoverPromise = ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zubenelgenubi' },
          },
        },
      },
      prompt: `Narrate this script with a deep, dramatic, and slightly ominous cinematic voice: ${script}`,
    });
    
    const audioBuffer = await voiceoverPromise.then(async (voiceoverResult) => {
        if (!voiceoverResult.media.url) {
          throw new Error('Failed to generate voiceover media.');
        }
        return Buffer.from(
          voiceoverResult.media.url.substring(voiceoverResult.media.url.indexOf(',') + 1),
          'base64'
        );
      });

    const sampleRate = 24000;
    const bitDepth = 16;
    const channels = 1;
    const audioDuration = audioBuffer.length / (sampleRate * (bitDepth / 8) * channels);

    const videoGenerationPromise = (async () => {
        let { operation } = await ai.generate({
            model: 'googleai/veo-2.0-generate-001',
            prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${script}`,
            config: {
                durationSeconds: Math.max(5, Math.min(8, Math.ceil(audioDuration))),
                aspectRatio: '16:9',
            },
        });

        if (!operation) {
            throw new Error('Video generation did not return an operation.');
        }

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
            throw new Error('Video generation failed: ' + operation.error.message);
        }

        const videoPart = operation.output?.message?.content.find(p => !!p.media);
        if (!videoPart || !videoPart.media?.url) {
            throw new Error('Failed to find the generated video in operation result.');
        }
        
        return `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    })();

    const [videoUrl, voiceoverResult] = await Promise.all([
      videoGenerationPromise,
      voiceoverPromise,
    ]);

    const timestamps = (voiceoverResult.custom?.timepoints as WordTimestamp[]) || [];
    const voiceoverMedia = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    
    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

    return {
      script,
      videoUrl,
      voiceoverMedia,
      audioDuration,
      timestamps
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
