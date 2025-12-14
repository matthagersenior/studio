
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // The default model is specified in the actions file
      // to allow for different models for different tasks (e.g., text, image, audio).
    }),
  ],
});
