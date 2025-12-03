
'use server';

/**
 * @fileOverview Generates a dramatic voiceover narration of the story script.
 *
 * - generateDramaticVoiceover - A function that handles the voiceover generation process.
 * - GenerateDramaticVoiceoverInput - The input type for the generateDramaticVoiceover function.
 * - GenerateDramaticVoiceoverOutput - The return type for the generateDramaticVoiceover function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateDramaticVoiceoverInputSchema = z.object({
  script: z.string().describe('The story script to be narrated.'),
});
export type GenerateDramaticVoiceoverInput = z.infer<typeof GenerateDramaticVoiceoverInputSchema>;

const GenerateDramaticVoiceoverOutputSchema = z.object({
  media: z.string().describe('The generated voiceover audio in base64 encoded WAV format.'),
});
export type GenerateDramaticVoiceoverOutput = z.infer<typeof GenerateDramaticVoiceoverOutputSchema>;

export async function generateDramaticVoiceover(input: GenerateDramaticVoiceoverInput): Promise<GenerateDramaticVoiceoverOutput> {
  return generateDramaticVoiceoverFlow(input);
}

const generateDramaticVoiceoverFlow = ai.defineFlow(
  {
    name: 'generateDramaticVoiceoverFlow',
    inputSchema: GenerateDramaticVoiceoverInputSchema,
    outputSchema: GenerateDramaticVoiceoverOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zubenelgenubi' },
          },
        },
      },
      prompt: `Narrate this script with a deep, dramatic, and slightly ominous cinematic voice: ${input.script}`,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    return {
      media: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {bufs.push(d); });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
