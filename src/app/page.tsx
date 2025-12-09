"use client";

import { useState } from "react";
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
import { RetroLoader } from "@/components/retro-loader";


import type { GenerationResult } from "@/app/actions";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }).max(500, { message: "Prompt must be 500 characters or less." }),
});


export default function Home() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);

    const response = await generateStory(values.prompt);
    
    if (response.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: response.error,
      });
      setIsLoading(false);
    } else {
      setResult(response);
      // isLoading will be set to false when the component unmounts or StoryResult is shown
    }
  }

  function resetApp() {
    setResult(null);
    setIsLoading(false);
    form.reset();
  }
  
  if (result && !result.error) {
    return (
      <StoryResult 
        script={result.script} 
        visualUrl={result.visualUrl} 
        voiceoverMedia={result.voiceoverMedia} 
        audioDuration={result.audioDuration}
        onReset={resetApp} 
      />
    )
  }
  
  if (isLoading) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-black">
        <RetroLoader />
      </main>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full text-lg font-semibold py-6 bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-[1.01]">
                   ROT IT!
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
