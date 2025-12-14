
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from '@genkit-ai/google-genai';

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

async function generateInitialImage(prompt: string, script: string): Promise<string> {
    const imageResponse = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a chaotic, meme-worthy, absurd, dramatic, high-energy, and slightly surreal image. Style: animated, digital art. Prompt: "${prompt}". Script context: "${script}"`,
    });

    if (!imageResponse.media?.url) {
        throw new Error('Initial image generation failed to return media.');
    }
    return imageResponse.media.url;
}

async function generateVideoFromImage(prompt: string, script: string, imageUrl: string): Promise<string> {
    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: [
            { text: `Animate this image in a chaotic, dramatic, and absurd way, based on the script. Script: ${script}. Original prompt: ${prompt}` },
            { media: { url: imageUrl, contentType: 'image/png' } },
        ],
        config: {
            durationSeconds: 7, // Generate a 7-second video
            aspectRatio: '9:16',
        },
    });

    if (!operation) {
        throw new Error('Video generation operation could not be started.');
    }

    // Poll for completion
    const pollDeadline = Date.now() + 110000; // 110 seconds from now
    while (!operation.done && Date.now() < pollDeadline) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        operation = await ai.checkOperation(operation);
    }

    if (!operation.done) {
        throw new Error('Video generation timed out after 110 seconds.');
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find(p => !!p.media);
    if (!video?.media?.url) {
        throw new Error('Video generation did not return a valid video URL.');
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
    
    // First, generate the still image
    const imageUrl = await generateInitialImage(prompt, script);

    // Now, generate video and audio in parallel
    const [videoUrl, audioUrl] = await Promise.all([
        generateVideoFromImage(prompt, script, imageUrl),
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
