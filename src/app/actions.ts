'use server';

import { ai } from "@/ai/genkit";

export type ScriptGenerationResult = {
  script: string;
  error?: never;
} | {
  script?: never;
  error: string;
};

export type VideoGenerationResult = {
  videoUrl: string;
  estimatedDuration: number;
  error?: never;
} | {
  videoUrl?: never;
  estimatedDuration?: never;
  error: string;
};


export async function generateScript(prompt: string): Promise<ScriptGenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const scriptResponse = await ai.generate({
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Prompt: ${prompt}`,
    });

    let script = scriptResponse.text;
    if (!script) {
        return { error: 'Failed to generate story script.' };
    }
    
    // Clean the script for display
    const cleanScript = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();
    
    return { script: cleanScript };

  } catch (e: any) {
    console.error('Script generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during script generation.';
    
    if (errorMessage.includes('429')) {
        return { error: "We're experiencing high demand right now. Please wait a moment and try again." };
    }
    if (errorMessage.includes('violate Gemini API')) {
        return { error: "The prompt could not be submitted. This prompt contains words that violate Gemini API's usage guidelines. Try rephrasing the prompt. If you think this was an error, send feedback." };
    }
    
    return { error: errorMessage };
  }
}

export async function generateVideo(script: string): Promise<VideoGenerationResult> {
  try {
    const estimatedDuration = 8;

    let videoOperation = (await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction based on this absurd script: ${script}`,
        config: {
            durationSeconds: estimatedDuration,
            aspectRatio: '9:16',
        },
    })).operation;

    if (!videoOperation) {
        throw new Error('Video generation did not return an operation.');
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
      videoUrl,
      estimatedDuration,
    };

  } catch (e: any) {
    console.error('Video generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during video generation.';
    return { error: errorMessage };
  }
}
