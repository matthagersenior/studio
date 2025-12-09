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
import { generateScript, generateVideo } from "@/app/actions";
import { StoryResult } from "@/components/story-result";
import Image from 'next/image';

import type { VideoGenerationResult } from "@/app/actions";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }).max(500, { message: "Prompt must be 500 characters or less." }),
});

type LoadingState = 'idle' | 'script' | 'video';

export default function Home() {
  const [videoResult, setVideoResult] = useState<VideoGenerationResult | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoadingState('script');
    setScript(null);
    setVideoResult(null);

    const scriptResponse = await generateScript(values.prompt);
    
    if (scriptResponse.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: scriptResponse.error,
      });
      setLoadingState('idle');
    } else {
      setScript(scriptResponse.script);
      setLoadingState('video');
    }
  }

  useEffect(() => {
    if (loadingState === 'video' && script) {
      const createVideo = async () => {
        const videoResponse = await generateVideo(script);
        if (videoResponse.error) {
          toast({
            variant: "destructive",
            title: "Video Generation Failed",
            description: videoResponse.error,
          });
          // Reset to idle but keep script so user doesn't lose it
          setLoadingState('idle');
        } else {
          setVideoResult(videoResponse);
        }
      };
      createVideo();
    }
  }, [loadingState, script, toast]);

  function resetApp() {
    setVideoResult(null);
    setScript(null);
    setLoadingState('idle');
    form.reset();
  }
  
  if (videoResult && !videoResult.error && script) {
    return (
      <StoryResult
        script={script}
        videoUrl={videoResult.videoUrl}
        duration={videoResult.estimatedDuration}
        onReset={resetApp}
      />
    );
  }
  
  if (loadingState === 'script') {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-black text-white">
        <Image 
            src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTBscjB3eGI4dmRmbnhxbm5tM3ZqN2s4bWhpYm12bXJseTNxZzV6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif"
            alt="Now Loading..."
            width={300}
            height={300}
            unoptimized
        />
        <p className="mt-4 text-lg font-mono text-center">Reading your mind...</p>
      </main>
    );
  }

  if (loadingState === 'video' && script) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-black text-white">
        <div className="max-w-prose text-center space-y-6">
            <p className="text-2xl font-headline">&quot;{script}&quot;</p>
            <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-yellow-400"></div>
                <p className="text-lg font-mono">Generating video...</p>
            </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm-p-8 bg-black">
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
            <CardDescription className="text-gray-600">Enter a prompt and let AI do the rest.</CardDescription>
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
                          placeholder="e.g., A jellyfish riding a bicycle in Paris"
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
                <Button type="submit" disabled={loadingState !== 'idle'} className="w-full text-lg font-semibold py-6 bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-[1.01]">
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
