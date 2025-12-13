
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import fetch from 'node-fetch';

export type StoryResultPayload = {
  script: string;
  imageUrl?: string;
  audioUrl?: string;
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

async function generateCinematicImage(prompt: string): Promise<string> {
    const imageResponse = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Create a single cinematic, surreal, and meme-worthy image based on this prompt: "${prompt}". The style should be dramatic, high-energy, and slightly absurd. Use a 9:16 aspect ratio.`,
    });

    if (!imageResponse.media?.url) {
        throw new Error('Failed to generate the cinematic image.');
    }
    return imageResponse.media.url;
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
    const script = await generateScript(prompt);
    
    // Run image and audio generation in parallel
    const [imageResult, audioResult] = await Promise.allSettled([
      generateCinematicImage(prompt),
      generateVoiceover(script),
    ]);

    if (imageResult.status === 'rejected') {
      throw new Error(`Image generation failed: ${imageResult.reason?.message || 'Unknown error'}`);
    }

    if (audioResult.status === 'rejected') {
      throw new Error(`Audio generation failed: ${audioResult.reason?.message || 'Unknown error'}`);
    }

    return { 
      script, 
      imageUrl: imageResult.value, 
      audioUrl: audioResult.value 
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
