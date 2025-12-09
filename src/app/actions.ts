'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  videoUrl: string;
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

async function generateVoiceover(script: string): Promise<string> {
  const voiceoverResult = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    prompt: script,
    config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A more dramatic voice
          },
        },
    },
  });

  if (!voiceoverResult.media?.url) {
    throw new Error('The voiceover could not be generated.');
  }
  
  const pcmData = Buffer.from(voiceoverResult.media.url.substring(voiceoverResult.media.url.indexOf(',') + 1), 'base64');
  const wavData = await toWav(pcmData);
  
  return `data:audio/wav;base64,${wavData}`;
}

async function generateInitialImage(prompt: string): Promise<string> {
    const imageResponse = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Create a single cinematic, surreal, and meme-worthy image based on this prompt: "${prompt}". The style should be dramatic, high-energy, and slightly absurd. Use a 9:16 aspect ratio. This image will be used as the starting point for an animation.`,
    });

    if (!imageResponse.media?.url) {
        throw new Error('Failed to generate the initial image.');
    }
    return imageResponse.media.url;
}


async function generateVideoFromImage(script: string, imageUri: string): Promise<string> {
    // Clamp the duration to be between 5 and 8 seconds, as required by the model.
    const estimatedDuration = Math.max(5, Math.min(8, Math.round(script.split(' ').length / 2.5)));
    
    let videoOperation = (await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: [
            { text: `Animate this image in a surreal, chaotic, and meme-worthy style based on the following script. The motion should be dramatic, continuous, and high-energy. Script: ${script}` },
            { media: { url: imageUri } }
        ],
        config: {
            durationSeconds: estimatedDuration,
            aspectRatio: '9:16',
        },
    })).operation;

    if (!videoOperation) {
        throw new Error('Video generation did not return an operation.');
    }

    // Wait for the long-running operation to complete
    while (!videoOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
        videoOperation = await ai.checkOperation(videoOperation);
    }

    if (videoOperation.error) {
        console.error('Video generation operation failed:', videoOperation.error);
        throw new Error(`Video generation failed: ${videoOperation.error.message}`);
    }

    const videoPart = videoOperation.output?.message?.content.find(p => !!p.media);
    if (!videoPart || !videoPart.media?.url) {
        throw new Error('Failed to find the generated video in the operation result.');
    }
    
    // The URL from Veo needs the API key to be downloadable by the client
    return `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Generate script and initial image in parallel
    const [script, initialImage] = await Promise.all([
        generateScript(prompt),
        generateInitialImage(prompt)
    ]);
    
    // Generate voiceover and video in parallel
    const [audioUrl, videoUrl] = await Promise.all([
        generateVoiceover(script),
        generateVideoFromImage(script, initialImage)
    ]);
    
    return { script, audioUrl, videoUrl };

  } catch (e: any) {
    console.error('Story generation failed:', e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    // Provide user-friendly error messages for common issues
    if (errorMessage.includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    } else if (errorMessage.includes('durationSeconds')) {
        errorMessage = "There was an internal issue with the video generation parameters. Please try again.";
    }
    
    return { error: errorMessage };
  }
}
