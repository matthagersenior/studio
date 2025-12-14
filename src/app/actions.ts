
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";
import * as fs from 'fs';
import { Readable } from 'stream';
import type { MediaPart } from 'genkit';


export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  videoUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

const ScriptSchema = z.string().describe("A short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions.");

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

    const chunks: Buffer[] = [];
    for await (const chunk of videoDownloadResponse.body) {
        chunks.push(chunk as Buffer);
    }
    const videoBuffer = Buffer.concat(chunks);
    return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // STAGE 1: Generate the script
    const scriptResponse = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a script for a short video. The script should be a very short, absurd, single-paragraph story. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses. User Prompt: ${prompt}`,
        output: {
          schema: ScriptSchema,
        },
    });

    let script = scriptResponse.output;
    if (!script) {
        throw new Error('Failed to generate script.');
    }
    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

    // STAGE 2: Generate audio and video in PARALLEL
    const [audioResult, videoResult] = await Promise.all([
      // Audio Generation
      ai.generate({
          model: googleAI.model('gemini-2.5-flash-preview-tts'),
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Algenib' },
              },
            },
          },
          prompt: script,
      }),
      // Video Generation
      ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: `Create a cinematic, surreal, and slightly cursed short video based on this script: "${script}"`,
        config: {
          durationSeconds: 5,
          aspectRatio: '9:16',
        },
      })
    ]);

    // Process Audio
    const audioMedia = audioResult.media;
    if (!audioMedia?.url) {
      throw new Error('Failed to generate voiceover.');
    }
    const audioBuffer = Buffer.from(audioMedia.url.substring(audioMedia.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;
    
    // Process Video
    let { operation } = videoResult;
    if (!operation) {
        throw new Error('Video generation operation did not start.');
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
        operation = await ai.checkOperation(operation);
    }
    
    if (operation.error) {
        throw new Error('Video generation failed: ' + operation.error.message);
    }
    
    const videoMediaPart = operation.output?.message?.content.find(p => !!p.media);
    if (!videoMediaPart) {
        throw new Error('Failed to find the generated video in operation result.');
    }

    const videoUrl = await downloadVideo(videoMediaPart);

    return {
      script,
      audioUrl,
      videoUrl,
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';

    if (String(e).includes('404')) {
      errorMessage = 'An underlying AI model is currently unavailable. Please try again later.';
    } else if (String(e).includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (String(e).includes('429') || String(e).includes('Too Many Requests') || String(e).includes('quota') || String(e).includes('resource has been exhausted')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    } else if (String(e).includes('INVALID_ARGUMENT')) {
        errorMessage = `A technical error occurred during generation: ${e.message}`;
    }

    return { error: errorMessage };
  }
}
