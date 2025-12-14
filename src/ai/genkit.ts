
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Using the default API version is more stable than forcing 'v1',
      // which was the root cause of the "Not Found" errors for the models.
    }),
  ],
});
