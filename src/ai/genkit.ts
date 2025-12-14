
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Using v1 is required for the models used in this app.
      apiVersion: 'v1',
    }),
  ],
});
