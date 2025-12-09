'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type TimedWord = {
  word: string;
  startTime: number;
  endTime: number;
};

export type GenerationResult = {
  script: string;
  videoUrl: string;
  voiceoverUrl: string;
  audioDuration: number;
  timestamps: TimedWord[];
  error?: never;
} | {
  script?: never;
  videoUrl?: never;
  voiceoverUrl?: never;
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
    
    // Clean the script for TTS and display
    const cleanScript = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

    // 2. Generate Video and Voiceover in Parallel
    const [videoResult, voiceoverResult] = await Promise.allSettled([
      // Video Promise
      ai.generate({
          model: 'googleai/veo-2.0-generate-001',
          prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${cleanScript}`,
          config: {
              aspectRatio: '9:16', // More mobile-friendly
          },
      }),
      // Voiceover Promise
      ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        prompt: cleanScript,
        config: {
          responseModalities: ['AUDIO'],
          enableTimepoints: true, // Request word timings
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Vesta',
              }
            }
          }
        },
      })
    ]);
    
    // Handle Video Result
    if (videoResult.status === 'rejected') {
      throw new Error(`Video generation failed: ${videoResult.reason?.message || 'Unknown error'}`);
    }
    let videoOperation = videoResult.value.operation;
    if (!videoOperation) {
        throw new Error('Video generation did not return an operation.');
    }

    // Handle Voiceover Result
    if (voiceoverResult.status === 'rejected') {
        throw new Error(`Failed to generate voiceover: ${voiceoverResult.reason?.message || 'Unknown error'}`);
    }
    if (!voiceoverResult.value.media?.url) {
      throw new Error('Voiceover generation did not return audio.');
    }
    
    // Extract voiceover data
    const pcmAudioBuffer = Buffer.from(voiceoverResult.value.media.url.substring(voiceoverResult.value.media.url.indexOf(',') + 1), 'base64');
    const voiceoverUrl = 'data:audio/wav;base64,' + await toWav(pcmAudioBuffer);
    
    // Extract and format timestamps
    const rawTimestamps = voiceoverResult.value.custom?.timepoints;
    if (!rawTimestamps || !Array.isArray(rawTimestamps.timeparts)) {
      return { error: 'Failed to get word timings for karaoke mode. Please try again.' };
    }
    const timestamps: TimedWord[] = rawTimestamps.timeparts.map((tp: any) => ({
      word: tp.text,
      startTime: tp.startTime.seconds + (tp.startTime.nanos / 1e9),
      endTime: tp.endTime.seconds + (tp.endTime.nanos / 1e9),
    }));

    const audioDuration = timestamps.length > 0 ? timestamps[timestamps.length - 1].endTime : 5;

    // Poll for video completion, now with duration
    videoOperation = (await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${cleanScript}`,
      config: {
        durationSeconds: Math.ceil(audioDuration),
        aspectRatio: '9:16',
      },
    })).operation;

    if (!videoOperation) {
      throw new Error('Video re-generation with duration failed.');
    }

    let finalOperation = videoOperation;
    while (!finalOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        finalOperation = await ai.checkOperation(finalOperation);
    }

    if (finalOperation.error) {
        throw new Error('Video generation failed: ' + finalOperation.error.message);
    }

    const videoPart = finalOperation.output?.message?.content.find(p => !!p.media);
    if (!videoPart || !videoPart.media?.url) {
        throw new Error('Failed to find the generated video in operation result.');
    }
    
    const videoUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    
    return {
      script: cleanScript,
      videoUrl,
      voiceoverUrl,
      audioDuration,
      timestamps,
    };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (errorMessage.includes('429')) {
        return { error: "We're experiencing high demand right now. Please wait a moment and try again." };
    }
    if (errorMessage.includes('violate Gemini API')) {
        return { error: "The prompt could not be submitted. This prompt contains words that violate Gemini API's usage guidelines. Try rephrasing the prompt. If you think this was an error, send feedback." };
    }


    return { error: errorMessage };
  }
}
