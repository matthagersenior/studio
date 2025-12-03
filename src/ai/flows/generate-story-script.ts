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
      prompt: `You are an AI specializing in surreal, chaotic, and meme-worthy content. Write a very short, absurd, single-paragraph script based on the user's prompt. The language should be deliberately exaggerated and contain elements of internet culture. The output must be 2-4 sentences long and include a clear, strange visual description. Use a dramatic, high-energy tone. Prompt: ${input.prompt}`,
    });
    return { script: text };
  }
);
