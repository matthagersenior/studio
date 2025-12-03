'use server';

/**
 * @fileOverview A story script generation AI agent.
 * 
 * - generateStoryScript - A function that generates a story script.
 * - GenerateStoryScriptInput - The input type for the generateStoryScript function.
 * - GenerateStoryScriptOutput - The return type for the generateStoryScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryScriptInputSchema = z.object({
  prompt: z.string().describe('A prompt for generating a story script.'),
});

export type GenerateStoryScriptInput = z.infer<typeof GenerateStoryScriptInputSchema>;

const GenerateStoryScriptOutputSchema = z.object({
  script: z.string().describe('The generated story script.'),
});

export type GenerateStoryScriptOutput = z.infer<typeof GenerateStoryScriptOutputSchema>;

export async function generateStoryScript(input: GenerateStoryScriptInput): Promise<GenerateStoryScriptOutput> {
  return generateStoryScriptFlow(input);
}

const generateStoryScriptFlow = ai.defineFlow(
  {
    name: 'generateStoryScriptFlow',
    inputSchema: GenerateStoryScriptInputSchema,
    outputSchema: GenerateStoryScriptOutputSchema,
  },
  async input => {
    const {text} = await ai.generate({
      prompt: `You are a script writer for short cinematic stories. Generate a short story script based on the user's prompt, optimized for cinematic visuals.\n\nPrompt: ${input.prompt}`,
    });
    return { script: text };
  }
);
