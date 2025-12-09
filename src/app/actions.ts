'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  videoUrl?: string; // Optional: for the single video case
  videoUrls?: string[]; // Optional: for the video sequence case
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
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A dramatic voice
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
    const estimatedDuration = Math.max(5, Math.min(8, Math.round(script.split(' ').length / 2.5)));
    
    let videoOperation = (await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: [
            { text: `Animate this image in a surreal, chaotic, and meme-worthy style based on the following script. The motion should be dramatic, continuous, and high-energy. Script: ${script}` },
            { media: { url: imageUri, contentType: 'image/png' } }
        ],
        config: {
            durationSeconds: estimatedDuration,
            aspectRatio: '9:16',
        },
    })).operation;

    if (!videoOperation) {
        throw new Error('Video generation did not return an operation.');
    }

    while (!videoOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000)); 
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
    
    return `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
}

async function generateVideoSequence(script: string): Promise<string[]> {
    console.log("Fallback: Generating video sequence.");
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const videoClipPromises = sentences.map(async (sentence) => {
        let videoOperation = (await ai.generate({
            model: 'googleai/veo-2.0-generate-001',
            prompt: `Create a short, surreal, and chaotic video clip for the following line: "${sentence}"`,
            config: {
                durationSeconds: 5, // A valid, fixed duration for each clip
                aspectRatio: '9:16',
            },
        })).operation;

        if (!videoOperation) {
            throw new Error('Video sequence generation did not return an operation.');
        }

        while (!videoOperation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            videoOperation = await ai.checkOperation(videoOperation);
        }

        if (videoOperation.error) {
            console.error(`Video clip generation failed for sentence: "${sentence}"`, videoOperation.error);
            // In a real app, you might want a placeholder or retry, but here we'll throw
            throw new Error(`Failed to generate a video clip: ${videoOperation.error.message}`);
        }

        const videoPart = videoOperation.output?.message?.content.find(p => !!p.media);
        if (!videoPart || !videoPart.media?.url) {
            throw new Error('Failed to find the generated video clip.');
        }
        
        return `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    });

    return Promise.all(videoClipPromises);
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const script = await generateScript(prompt);
    const audioUrl = await generateVoiceover(script);
    
    try {
      const initialImage = await generateInitialImage(prompt);
      const videoUrl = await generateVideoFromImage(script, initialImage);
      return { script, audioUrl, videoUrl };
    } catch (videoError: any) {
        const errorMessage = videoError.message || '';
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota') || errorMessage.includes('high demand')) {
            console.warn("Primary video generation failed due to rate limits. Attempting fallback to video sequence.");
            const videoUrls = await generateVideoSequence(script);
            return { script, audioUrl, videoUrls };
        }
        // If it's a different error, re-throw to be caught by the outer block
        throw videoError;
    }

  } catch (e: any) {
    console.error('Story generation failed:', e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';
    
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
