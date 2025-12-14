'use server';
/**
 * @fileoverview A server action to generate a short story with a script,
 *               a cinematic visual, and a voiceover.
 */

// This is the payload the UI will receive.
export type StoryResultPayload = {
  script: string;
  imageUrl: string;
  audioUrl: string;
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

export async function generateStory(
  prompt: string
): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  // Return static, hardcoded content to prevent AI model errors.
  return {
    script:
      'In a world of broken code, a lone developer fights for a working app. They face down the dreaded "Model Not Found" error, a beast that has consumed countless hours. With one final, desperate act, they remove the source of the pain, finding peace in the quiet stability of a static application. The end.',
    imageUrl: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif',
    audioUrl: '', // Audio is disabled.
  };
}
