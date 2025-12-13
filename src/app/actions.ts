
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
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: [
            { text: `Animate this image in a short, looping, chaotic, meme-worthy style based on the following script: ${script}` },
            { media: { url: imageUrl } },
        ],
        config: {
            durationSeconds: 6,
            aspectRatio: '9:16',
        },
    });

    if (!operation) {
        throw new Error('Video generation operation failed to start.');
    }
    
    // Increased timeout loop
    const maxWaitTime = 120000; // 2 minutes
    const pollInterval = 5000; // 5 seconds
    let waitedTime = 0;

    while (!operation.done && waitedTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        waitedTime += pollInterval;
        operation = await ai.checkOperation(operation);
    }
    
    if (!operation.done) {
        throw new Error('Video generation timed out.');
    }

    if (operation.error) {
        throw new Error(`Failed to generate video: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video?.media?.url) {
        throw new Error('Generated video content could not be found.');
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
    
    // Step 1: Generate the initial image. This is required for the next step.
    const imageUrl = await generateInitialImage(script);

    // Step 2 & 3: Kick off video animation and voiceover generation in parallel
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
      videoUrl: videoResult.value,
      audioUrl: audioResult.value,
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
