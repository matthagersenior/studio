'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { MediaPart } from 'genkit';

export type GenerationResult = {
  script: string;
  visualUrl: string;
  voiceoverMedia: string;
  error?: never;
} | {
  script?: never;
  visualUrl?: never;
  voiceoverMedia?: never;
  error: string;
};


async function downloadVideo(video: MediaPart): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    // Add API key before fetching the video.
    const videoDownloadResponse = await fetch(
      `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
    );
    if (
      !videoDownloadResponse ||
      videoDownloadResponse.status !== 200 ||
      !videoDownloadResponse.body
    ) {
      throw new Error('Failed to fetch video');
    }
    
    const buffer = await videoDownloadResponse.buffer();
    return `data:video/mp4;base64,${buffer.toString('base64')}`;
}


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
      // Generate Cinematic Video
      ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd scene: ${script}`,
        config: {
          durationSeconds: 5,
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
    let visualUrl: string;
    if (visualResult.status === 'fulfilled' && visualResult.value.operation) {
        let operation = visualResult.value.operation;
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            operation = await ai.checkOperation(operation);
        }
        if (operation.error) {
            throw new Error('Video generation operation failed: ' + operation.error.message);
        }
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video) {
            throw new Error('Failed to find the generated video in operation output.');
        }
        visualUrl = await downloadVideo(video);

    } else {
      const reason = visualResult.status === 'rejected' ? visualResult.reason.message : 'Video generation result was empty.';
      console.error('Video generation failed:', reason);
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
      visualUrl,
      voiceoverMedia,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    return { error: e.message || 'An unexpected error occurred during generation. Please try again later.' };
  }
}
