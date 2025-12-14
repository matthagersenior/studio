
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from '@genkit-ai/google-genai';
import { MediaPart } from "genkit";

export type StoryResultPayload = {
  script: string;
  videoUrl?: string; 
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

async function generateImage(prompt: string, script: string): Promise<MediaPart> {
    const imageResponse = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a chaotic, meme-worthy, absurd, dramatic, high-energy, and slightly surreal image. Style: animated, digital art. Prompt: "${prompt}". Script context: "${script}"`,
    });

    if (!imageResponse.media) {
        throw new Error('Image generation failed to return media.');
    }
    return imageResponse.media;
}


async function generateVideoFromImage(image: MediaPart): Promise<string> {
  let { operation } = await ai.generate({
    model: 'googleai/veo-2.0-generate-001',
    prompt: [
      { text: 'Make this image move in a subtle, looping, chaotic, and meme-worthy way.' },
      { media: { url: image.url, contentType: image.contentType || 'image/png' } },
    ],
    config: {
      durationSeconds: 6,
      aspectRatio: '9:16',
    },
  });

  if (!operation) {
    throw new Error('Expected the model to return an operation for video generation.');
  }

  // Poll for completion
  let pollCount = 0;
  const maxPolls = 20; // 20 * 5s = 100s total wait time
  while (!operation.done && pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.checkOperation(operation);
    pollCount++;
  }

  if (!operation.done) {
    throw new Error('Video generation timed out after 100 seconds.');
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${operation.error.message}`);
  }

  const video = operation.output?.message?.content.find((p) => !!p.media);
  if (!video || !video.media?.url) {
    throw new Error('Failed to find the generated video in the operation result.');
  }

  return video.media.url;
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
    
    const image = await generateImage(prompt, script);

    // Generate video and audio in parallel
    const [videoUrl, audioUrl] = await Promise.all([
        generateVideoFromImage(image),
        generateVoiceover(script),
    ]);
    
    // Success! Return all the generated assets.
    return { 
      script,
      videoUrl,
      audioUrl,
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
