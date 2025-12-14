
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";

export type StoryResultPayload = {
  script: string;
  videoUrl: string; 
  audioUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

async function generateScriptAndVoice(prompt: string): Promise<{ script: string; audioUrl: string }> {
  const scriptResponse = await ai.generate({
    prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses. Prompt: ${prompt}`,
  });
  
  let script = scriptResponse.text;
  if (!script) {
    throw new Error('Failed to generate story script.');
  }
  script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

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
  const audioUrl = `data:audio/wav;base64,${wavBase64}`;

  return { script, audioUrl };
}

async function generateVideoFromScript(script: string): Promise<string> {
  let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: `Generate a short, cinematic, and slightly surreal video that visually represents the following script: ${script}`,
      config: {
        durationSeconds: 5,
        aspectRatio: '9:16',
      },
  });

  if (!operation) {
    throw new Error('Expected the model to return a video generation operation.');
  }

  // Poll the operation until it's done. This is critical for slow generations.
  while (!operation.done) {
    console.log('Checking video generation status...');
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again.
    operation = await ai.checkOperation(operation);
  }

  if (operation.error) {
    console.error('Video generation failed:', operation.error);
    throw new Error(`Video generation failed: ${operation.error.message}`);
  }

  const videoPart = operation.output?.message?.content.find((p) => !!p.media);
  if (!videoPart || !videoPart.media?.url) {
    throw new Error('Failed to find the generated video in the operation result.');
  }

  // The URL from the operation is temporary and needs the API key to be accessed.
  const videoDownloadUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
  
  // Fetch the video content and convert it to a data URI
  const fetch = (await import('node-fetch')).default;
  const videoResponse = await fetch(videoDownloadUrl);

  if (!videoResponse.ok) {
    const errorBody = await videoResponse.text();
    console.error("Failed to download video:", videoResponse.status, errorBody);
    throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}`);
  }
  
  const videoBuffer = await videoResponse.arrayBuffer();
  const videoBase64 = Buffer.from(videoBuffer).toString('base64');
  
  return `data:${videoPart.media.contentType || 'video/mp4'};base64,${videoBase64}`;
}


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // Generate script and audio first
    const { script, audioUrl } = await generateScriptAndVoice(prompt);
    
    // Then, generate the video based on the script
    const videoUrl = await generateVideoFromScript(script);

    return { 
      script,
      videoUrl,
      audioUrl,
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
