
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
  // Clean up any bracketed/parenthetical scene directions
  return script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();
}

async function generateVideo(prompt: string, script: string): Promise<string> {
    let { operation } = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Create a short, looping, chaotic, meme-worthy animated video based on this prompt: "${prompt}". The style should be dramatic, high-energy, and slightly absurd, reflecting the tone of this script: "${script}"`,
         config: {
            durationSeconds: 8,
            aspectRatio: '9:16',
        },
    });

    if (!operation) {
        throw new Error('Video generation operation did not start.');
    }
    
    // Poll for completion
    let finalOperation = operation;
    const maxWaitTime = 110000; // Wait for up to 110 seconds
    const interval = 5000;
    let waitedTime = 0;

    while (!finalOperation.done && waitedTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, interval));
        waitedTime += interval;
        finalOperation = await ai.checkOperation(finalOperation);
    }
    
    if (!finalOperation.done) {
        throw new Error('Video generation timed out after 110 seconds.');
    }

    if (finalOperation.error) {
        throw new Error(`Video generation failed: ${finalOperation.error.message}`);
    }
    
    const video = finalOperation.output?.message?.content.find((p) => !!p.media);
    if (!video?.media?.url) {
        throw new Error('Generated video content could not be found.');
    }

    // The URL from Veo is temporary and needs to be fetched and re-encoded to be durable.
    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(
        `${video.media.url}&key=${process.env.GEMINI_API_KEY}`
    );

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download generated video (status: ${videoDownloadResponse.status})`);
    }

    const videoBuffer = await videoDownloadResponse.buffer();
    const contentType = video.media.contentType || 'video/mp4';

    return `data:${contentType};base64,${videoBuffer.toString('base64')}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Generate script first, as it's needed for the video prompt
    const script = await generateScript(prompt);

    // Kick off video generation
    const videoUrl = await generateVideo(prompt, script);
    
    // Success! Return all the generated assets.
    return { 
      script,
      videoUrl,
    };

  } catch (e: any) {
    console.error("Full error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    // Provide more user-friendly error messages for common issues.
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
