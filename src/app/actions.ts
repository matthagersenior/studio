'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type ScriptAndVoiceoverResult = {
  script: string;
  audioUrl: string;
  error?: never;
};

export type VideoResult = {
  videoUrl: string;
  error?: never;
}

export type StoryGenerationResult = {
  script?: string;
  videoUrl?: string;
  audioUrl?: string;
  error: string;
};


async function generateScript(prompt: string): Promise<string> {
  const scriptResponse = await ai.generate({
    prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Prompt: ${prompt}`,
  });
  
  let script = scriptResponse.text;
  if (!script) {
    throw new Error('Failed to generate story script.');
  }

  // Clean the script for display
  return script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();
}

async function generateVoiceover(script: string): Promise<{ audioUrl: string }> {
  const voiceoverResult = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    prompt: script,
    config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'vindemiatrix' },
          },
        },
    },
  });

  if (!voiceoverResult.media?.url) {
    throw new Error('The voiceover could not be generated.');
  }
  
  const pcmData = Buffer.from(voiceoverResult.media.url.substring(voiceoverResult.media.url.indexOf(',') + 1), 'base64');
  const wavData = await toWav(pcmData);
  
  return {
    audioUrl: `data:audio/wav;base64,${wavData}`,
  };
}


export async function generateVideo(script: string): Promise<VideoResult | StoryGenerationResult> {
  try {
    const estimatedDuration = Math.max(5, Math.min(8, Math.round(script.split(' ').length / 3)));

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
    
    return { videoUrl: `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}` };
  } catch(e: any) {
    console.error('Video generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during video generation.';
     if (errorMessage.includes('429')) {
        return { error: "We're experiencing high demand for video right now. Please try again later." };
    }
    return { error: errorMessage };
  }
}

export async function generateScriptAndVoiceover(prompt: string): Promise<ScriptAndVoiceoverResult | StoryGenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const script = await generateScript(prompt);
    const voiceoverResult = await generateVoiceover(script);

    return {
      script,
      audioUrl: voiceoverResult.audioUrl,
    };
  } catch (e: any) {
    console.error('Story generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during story generation.';
    
    if (errorMessage.includes('429')) {
        return { error: "We're experiencing high demand right now. Please wait a moment and try again." };
    }
    if (errorMessage.includes('violate Gemini API')) {
        return { error: "The prompt could not be submitted. This prompt contains words that violate Gemini API's usage guidelines. Try rephrasing the prompt. If you think this was an error, send feedback." };
    }
    
    return { error: errorMessage };
  }
}
