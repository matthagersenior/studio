import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Use a known stable model for all default generation tasks.
      // This can be overridden in specific generate() calls if needed.
      defaultModel: 'gemini-1.5-pro-latest',
    }),
  ],
});
