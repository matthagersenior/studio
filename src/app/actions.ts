'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  videoUrl?: string;
  videoUrls?: string[];
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
  
  return `data:audio/wav;base64,${wavData}`;
}

async function generateVideoSequence(script: string): Promise<string[]> {
    const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];

    const videoPromises = sentences.map(sentence => (async () => {
        const prompt = `Hyper-saturated, 8K, cinematic wide shot, volumetric lighting, photorealistic but surreal, low-fidelity effects, art direction for a chaotic meme based on this absurd script sentence: "${sentence}"`;
        
        let videoOperation = (await ai.generate({
            model: 'googleai/veo-2.0-generate-001',
            prompt,
            config: {
                durationSeconds: 2, // Short clip per sentence
                aspectRatio: '9:16',
            },
        })).operation;

        if (!videoOperation) {
            throw new Error(`Video clip generation did not return an operation for sentence: "${sentence}"`);
        }

        while (!videoOperation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            videoOperation = await ai.checkOperation(videoOperation);
        }

        if (videoOperation.error) {
            throw new Error(`Video clip generation failed: ${videoOperation.error.message}`);
        }

        const videoPart = videoOperation.output?.message?.content.find(p => !!p.media);
        if (!videoPart || !videoPart.media?.url) {
            throw new Error('Failed to find the generated video clip in operation result.');
        }
        
        return `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    })());

    return Promise.all(videoPromises);
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const script = await generateScript(prompt);
    const audioUrl = await generateVoiceover(script);
    
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

        while (!videoOperation.done) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            videoOperation = await ai.checkOperation(videoOperation);
        }

        if (videoOperation.error) {
            throw new Error('Video generation failed: ' + videoOperation.error.message);
        }

        const videoPart = videoOperation.output?.message?.content.find(p => !!p.media);
        if (!videoPart || !videoPart.media?.url) {
            throw new Error('Failed to find the generated video in operation result.');
        }
        
        const videoUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
        return { script, audioUrl, videoUrl };

    } catch (e: any) {
        const errorMessage = e.message || '';
        console.error('Video generation failed, falling back to video sequence.', e);
        
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota')) {
            console.log("Fallback: Generating video sequence due to rate limit.");
            const videoUrls = await generateVideoSequence(script);
            return { script, audioUrl, videoUrls: videoUrls };
        }
        
        console.log("Fallback: Generating video sequence due to other video error.");
        const videoUrls = await generateVideoSequence(script);
        return { script, audioUrl, videoUrls: videoUrls };
    }

  } catch (e: any) {
    console.error('Story generation failed:', e);
    const errorMessage = e.message || 'An unexpected error occurred during generation.';
    
    if (errorMessage.includes('safety policies')) {
        return { error: "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt." };
    }
    
    return { error: errorMessage };
  }
}
