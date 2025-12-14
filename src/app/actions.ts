
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type StoryResultPayload = {
  script: string;
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string; // Keep imageUrl for context, even if video is the primary visual
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

async function generateInitialImage(prompt: string): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a cinematic, surreal, and meme-worthy animated still image based on this script: "${prompt}". The style should be dramatic, high-energy, and slightly absurd.`,
    });

    if (!media.url) {
        throw new Error('Failed to generate initial image.');
    }
    return media.url;
}

async function generateVideoFromImage(imageUrl: string, script: string): Promise<string> {
    let { operation } = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: [
            { text: `Animate this image in a short, looping, chaotic, meme-worthy style. The animation should reflect the absurd energy of the following script: ${script}` },
            { media: { url: imageUrl, contentType: 'image/png' } },
        ],
         config: {
            durationSeconds: 5,
            aspectRatio: '9:16',
        },
    });

    if (!operation) {
        throw new Error('Video generation operation did not start.');
    }
    
    let finalOperation = operation;
    // Wait for up to 90 seconds.
    const maxWaitTime = 90000;
    const interval = 5000;
    let waitedTime = 0;

    while (!finalOperation.done && waitedTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, interval));
        waitedTime += interval;
        finalOperation = await ai.checkOperation(finalOperation);
    }
    
    if (!finalOperation.done) {
        throw new Error('Video generation timed out after 90 seconds.');
    }

    if (finalOperation.error) {
        throw new Error(`Video generation failed: ${finalOperation.error.message}`);
    }
    
    const video = finalOperation.output?.message?.content.find((p) => !!p.media);
    if (!video?.media?.url) {
        throw new Error('Generated video content could not be found.');
    }

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

  const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
  const wavBase64 = await toWav(audioBuffer);

  return `data:audio/wav;base64,${wavBase64}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const script = await generateScript(prompt);
    const imageUrl = await generateInitialImage(script);

    const [videoResult, audioResult] = await Promise.allSettled([
      generateVideoFromImage(imageUrl, script), 
      generateVoiceover(script),
    ]);
    
    if (videoResult.status === 'rejected') {
      console.error("Video generation failed:", videoResult.reason);
      throw new Error(`Video generation failed: ${videoResult.reason?.message || 'Unknown error'}`);
    }
    
    if (audioResult.status === 'rejected') {
        console.error("Audio generation failed:", audioResult.reason);
        throw new Error(`Audio generation failed: ${audioResult.reason?.message || 'Unknown error'}`);
    }

    return { 
      script,
      imageUrl,
      videoUrl: videoResult.value,
      audioUrl: audioResult.value,
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
