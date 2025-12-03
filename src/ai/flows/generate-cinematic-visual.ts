'use server';

/**
 * @fileOverview Generates a cinematic visual based on a story script.
 *
 * - generateCinematicVisual - A function that generates a cinematic visual.
 * - GenerateCinematicVisualInput - The input type for the generateCinematicVisual function.
 * - GenerateCinematicVisualOutput - The return type for the generateCinematicVisual function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCinematicVisualInputSchema = z.object({
  storyScript: z.string().describe('The story script to base the visual on.'),
});
export type GenerateCinematicVisualInput = z.infer<typeof GenerateCinematicVisualInputSchema>;

const GenerateCinematicVisualOutputSchema = z.object({
  visualDataUri: z.string().describe('The generated cinematic visual as a data URI.'),
});
export type GenerateCinematicVisualOutput = z.infer<typeof GenerateCinematicVisualOutputSchema>;

export async function generateCinematicVisual(input: GenerateCinematicVisualInput): Promise<GenerateCinematicVisualOutput> {
  return generateCinematicVisualFlow(input);
}

const generateCinematicVisualFlow = ai.defineFlow(
  {
    name: 'generateCinematicVisualFlow',
    inputSchema: GenerateCinematicVisualInputSchema,
    outputSchema: GenerateCinematicVisualOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a cinematic visual based on the following story script: ${input.storyScript}`,
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate cinematic visual.');
    }

    return {visualDataUri: media.url};
  }
);