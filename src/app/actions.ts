
'use server';

import { ai } from "@/ai/genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

// This is the payload the UI will receive. It is simplified to only include the script and a static imageUrl.
export type StoryResultPayload = {
  script: string;
  imageUrl: string; // This will always be a static GIF URL.
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

// A simple schema to ensure the model returns a script.
const ScriptOutputSchema = z.object({
    script: z.string().describe("A short, absurd, single-paragraph script. 3-5 sentences long. No scene descriptions. The language should be deliberately exaggerated and contain elements of internet culture. Use a dramatic, high-energy tone."),
});


/**
 * Generates a story script and returns it along with a static GIF.
 * This is a simplified, stable version that removes image and audio generation.
 */
export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  try {
    // A single, reliable AI call to generate the script.
    const scriptResult = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Based on the user's prompt, generate a script for a short video.
  
        User Prompt: ${prompt}`,
        output: {
          schema: ScriptOutputSchema,
        },
    });
    
    let { script } = scriptResult.output || {};

    if (!script) {
        throw new Error('Failed to generate a script.');
    }
    
    // Clean up any stray markdown or parentheticals the model might add.
    script = script.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    
    // The visual is a static, reliable GIF. This avoids AI model availability issues.
    const imageUrl = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif";

    // Return the successful payload.
    return {
      script,
      imageUrl,
    };

  } catch (e: any) {
    console.error("Error in generateStory:", e);
    let errorMessage = e.message || 'An unexpected error occurred during generation.';

    if (String(e).includes('safety policies')) {
        errorMessage = "The prompt could not be submitted as it may violate safety policies. Please rephrase your prompt.";
    } else if (String(e).includes('429') || String(e).includes('Too Many Requests') || String(e).includes('quota')) {
        errorMessage = "The generator is currently under high demand. Please try again in a few moments.";
    }

    return { error: errorMessage };
  }
}
