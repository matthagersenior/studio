
'use server';

import { ai } from "@/ai/genkit";

export type StoryResultPayload = {
  script: string;
  videoUrl?: string;
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

async function generateVideoWithSound(prompt: string): Promise<string> {
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: `Create a cinematic, surreal, and meme-worthy video based on this prompt: "${prompt}". The style should be dramatic, high-energy, and slightly absurd. Use a 9:16 aspect ratio. The video should have an epic, orchestral, slightly off-key background music track.`,
      config: {
        durationSeconds: 5,
        aspectRatio: '9:16',
      },
    });

    if (!operation) {
        throw new Error('Video generation operation did not start.');
    }

    // Wait for the operation to complete, with a generous timeout.
    const maxWaitTime = 120 * 1000; // 2 minutes
    const checkInterval = 5000; // 5 seconds
    let elapsedTime = 0;

    while (!operation.done && elapsedTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        operation = await ai.checkOperation(operation);
        elapsedTime += checkInterval;
    }
    
    if (!operation.done) {
        throw new Error('Video generation timed out.');
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video?.media?.url) {
        throw new Error('Failed to find the generated video in the operation result.');
    }

    // The URL from VEO is temporary and needs to be fetched and re-encoded.
    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(
        `${video.media.url}&key=${process.env.GEMINI_API_KEY}`
    );

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to fetch video from temporary URL: ${videoDownloadResponse.statusText}`);
    }
    
    const buffer = await videoDownloadResponse.buffer();
    const contentType = video.media.contentType || 'video/mp4';
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Run script and video generation in parallel
    const [scriptResult, videoResult] = await Promise.allSettled([
      generateScript(prompt),
      generateVideoWithSound(prompt),
    ]);

    if (scriptResult.status === 'rejected') {
      throw new Error(`Script generation failed: ${scriptResult.reason?.message || 'Unknown error'}`);
    }

    if (videoResult.status === 'rejected') {
      throw new Error(`Video generation failed: ${videoResult.reason?.message || 'Unknown error'}`);
    }
    
    return { 
      script: scriptResult.value, 
      videoUrl: videoResult.value 
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (String(e.message).includes('404')) {
      errorMessage = 'An underlying AI model is currently unavailable. Please try again later.';
    } else if (errorMessage.includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota') || errorMessage.includes('resource has been exhausted')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    }
    
    return { error: errorMessage };
  }
}
