
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateStory } from "@/app/actions";
import { StoryResult } from "@/components/story-result";
import type { StoryResultPayload } from "@/app/actions";
import { useUser, useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import Image from "next/image";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }).max(500, { message: "Prompt must be 500 characters or less." }),
});

type LoadingState = 'idle' | 'generating';

export default function Home() {
  const [generationResult, setGenerationResult] = useState<Omit<StoryResultPayload, 'error'> | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
         toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Could not start an anonymous session. Please try refreshing the page.",
         });
      });
    }
  }, [user, isUserLoading, auth, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoadingState('generating');
    setGenerationResult(null);

    const result = await generateStory(values.prompt);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error,
      });
      setLoadingState('idle');
    } else {
      setGenerationResult(result);
      setLoadingState('idle');
    }
  }

  function resetApp() {
    setGenerationResult(null);
    setLoadingState('idle');
    form.reset();
  }

  const isLoading = isUserLoading || loadingState === 'generating';

  if (isLoading) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-black text-white">
        {loadingState === 'generating' ? (
          <>
            <Image 
                src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif"
                alt="Now Loading..."
                width={300}
                height={300}
                unoptimized
            />
            <p className="mt-4 text-lg font-mono text-center">Your brain is rotting...</p>
            <p className="mt-2 text-sm text-gray-400 font-mono text-center">Good things take time... this can take up to a minute.</p>
          </>
        ) : (
           <p>Loading...</p>
        )}
      </main>
    );
  }

  if (generationResult) {
    return (
      <StoryResult
        script={generationResult.script}
        videoUrl={generationResult.videoUrl}
        audioUrl={generationResult.audioUrl}
        onReset={resetApp}
      />
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-black">
      <div className="max-w-4xl mx-auto space-y-8 w-full">
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white font-headline">
            AI BRAIN ROT
          </h1>
          <p className="text-gray-400 mt-2">
            Let's See What We Can Come Up With
          </p>
        </header>

        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-800">Create Your Story</CardTitle>
            <CardDescription className="text-gray-600">Enter a prompt and let AI bring it to life.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Your Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A dramatic monologue for a cat staring out a window"
                          className="resize-none bg-white/50 text-base text-gray-800"
                          rows={3}
                          {...field}
                          disabled={loadingState !== 'idle'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loadingState !== 'idle' || isUserLoading} className="w-full text-lg font-semibold py-6 bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-[1.01]">
                   {loadingState !== 'idle' ? 'Generating...' : 'ROT IT!'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
