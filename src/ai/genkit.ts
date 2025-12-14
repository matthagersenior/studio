
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Force the plugin to use the 'v1' API.
      // The 'v1beta' endpoint does not support the models used in this app,
      // which was the cause of the persistent "Not Found" errors.
      apiVersion: 'v1',
    }),
  ],
});
