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

    // 2. Generate Voiceover to get duration
    const voiceoverResult = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      prompt: cleanScript,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'vindemiatrix',
            }
          }
        }
      },
    });
    
    if (!voiceoverResult.media?.url || !voiceoverResult.custom?.audioDurationMillis) {
      throw new Error('Failed to generate voiceover or get its duration.');
    }
    
    const pcmAudioBuffer = Buffer.from(voiceoverResult.media.url.substring(voiceoverResult.media.url.indexOf(',') + 1), 'base64');
    const voiceoverUrl = 'data:audio/wav;base64,' + await toWav(pcmAudioBuffer);
    const audioDuration = voiceoverResult.custom.audioDurationMillis / 1000;


    // 3. Generate Video with the correct duration
    let videoOperation = (await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${cleanScript}`,
        config: {
            durationSeconds: Math.ceil(audioDuration),
            aspectRatio: '9:16',
        },
    })).operation;

    if (!videoOperation) {
        throw new Error('Video generation did not return an operation.');
    }

    // 4. Poll for video completion
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
    
    // 5. Create simulated timestamps for karaoke effect
    const words = cleanScript.split(/\s+/);
    const totalWords = words.length;
    const durationPerWord = audioDuration / totalWords;
    const timestamps: TimedWord[] = words.map((word, index) => {
        const startTime = index * durationPerWord;
        const endTime = startTime + durationPerWord;
        return { word, startTime, endTime };
    });

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
    if (errorMessage.includes('Failed to generate voiceover')) {
       return { error: "The voiceover could not be generated. Please try a different prompt." };
    }


    return { error: errorMessage };
  }
}
