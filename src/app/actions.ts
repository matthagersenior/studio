'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from '@genkit-ai/google-genai';
import { GenerateRequest } from "genkit";

export type StoryResultPayload = {
  script: string;
  videoUrl: string;
  audioUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

async function generateScript(prompt: string): Promise<string> {
  const scriptResponse = await ai.generate({
    prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses. Prompt: ${prompt}`,
  });
  
  let script = scriptResponse.text;
  if (!script) {
    throw new Error('Failed to generate story script.');
  }
  return script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();
}

async function generateImage(prompt: string): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a single, cinematic, high-quality, vibrant, and slightly surreal image to accompany the following script. The image should be in a vertical 9:16 aspect ratio. Script: "${prompt}"`
    });

    if (!media?.url) {
        throw new Error('Failed to generate image.');
    }
    return media.url;
}

async function generateVideo(imageUrl: string, prompt: string): Promise<string> {
    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: [
            { text: `Animate this image in a cinematic, looping style that matches the tone of the script. The video should have subtle but constant motion. Script: "${prompt}"` },
            { media: { url: imageUrl, contentType: 'image/png' } }
        ],
        config: {
            durationSeconds: 5,
            aspectRatio: '9:16',
        }
    } as GenerateRequest);

    if (!operation) {
        throw new Error('Expected the model to return an operation for video generation.');
    }

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
        operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
        console.error('Video generation failed:', operation.error);
        throw new Error(`Failed to generate video: ${operation.error.message}`);
    }

    const videoPart = operation.output?.message?.content.find(p => !!p.media && p.media.contentType === 'video/mp4');

    if (!videoPart?.media?.url) {
        throw new Error('Generated video content was not found in the operation result.');
    }
    
    // The URL from Veo is temporary and needs to be fetched and converted to a data URI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(`${videoPart.media.url}&key=${apiKey}`);

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download the generated video. Status: ${videoDownloadResponse.status}`);
    }

    const videoBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');
    
    return `data:video/mp4;base64,${base64Video}`;
}


async function generateVoiceover(script: string): Promise<string> {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: script,
    });
    
    if (!media?.url) {
      throw new Error('Failed to generate voiceover.');
    }
    
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);
    return `data:audio/wav;base64,${wavBase64}`;
}

export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Step 1: Generate Script
    const script = await generateScript(prompt);
    
    // Step 2: Generate Image and Audio in parallel
    const [imageUrl, audioUrl] = await Promise.all([
        generateImage(script),
        generateVoiceover(script)
    ]);
    
    // Step 3: Generate Video from the image
    const videoUrl = await generateVideo(imageUrl, script);

    return { 
      script,
      videoUrl,
      audioUrl,
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (String(e.message).includes('404')) {
      errorMessage = 'An underlying AI model is currently unavailable. Please try again later.';
    } else if (String(e.message).includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (String(e.message).includes('429') || String(e.message).includes('Too Many Requests') || String(e.message).includes('quota') || String(e.message).includes('resource has been exhausted')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    } else if (String(e.message).includes('INVALID_ARGUMENT')) {
        errorMessage = `A technical error occurred during generation: ${e.message}`;
    }
    
    return { error: errorMessage };
  }
}
