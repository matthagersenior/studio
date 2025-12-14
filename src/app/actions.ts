
'use server';

import { ai } from "@/ai/genkit";
import { toWav } from "@/lib/wav-converter";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

export type StoryResultPayload = {
  script: string;
  audioUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

const ScriptSchema = z.string().describe("A short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions.");


export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    const scriptResponse = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a script. The script should be a very short, absurd, single-paragraph story. The language should be deliberately exaggerated and contain elements of internet culture. The total output should be 3-5 sentences long. Use a dramatic, high-energy tone. Do not include scene descriptions or actions in brackets or parentheses. User Prompt: ${prompt}`,
        output: {
          schema: ScriptSchema,
        },
    });

    let script = scriptResponse.output;

    if (!script) {
        throw new Error('Failed to generate script.');
    }

    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/---/g, '\n\n').trim();

    const audioResponse = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
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


    const audioMedia = audioResponse.media;
    if (!audioMedia?.url) {
      throw new Error('Failed to generate voiceover.');
    }

    const audioBuffer = Buffer.from(
      audioMedia.url.substring(audioMedia.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    return {
      script,
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
