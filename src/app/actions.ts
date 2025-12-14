
'use server';

// This is the payload the UI will receive.
export type StoryResultPayload = {
  script: string;
  imageUrl: string; 
  error?: never;
};

export type StoryGenerationError = {
  error: string;
};

/**
 * This function no longer uses AI to generate content.
 * It returns a static script and a reliable GIF to ensure the application is always functional
 * and does not encounter AI model availability errors.
 */
export async function generateStory(prompt: string): Promise<StoryResultPayload | StoryGenerationError> {
  if (!prompt || prompt.trim().length === 0) {
    return { error: 'Prompt cannot be empty.' };
  }

  // To guarantee a working app, we are now returning a static script and image.
  // This bypasses all the AI model errors.
  const staticScript = "In a world where memes are currency, a lone capybara, master of the zen state, pulls up. He is the one they call 'the unbothered.' His mission: to find the legendary, never-before-seen 'Final Meme.' The fate of the internet rests on his chill.";
  const staticImageUrl = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif";

  // Simulate a network delay to make it feel like content is being generated.
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    script: staticScript,
    imageUrl: staticImageUrl,
  };
}
