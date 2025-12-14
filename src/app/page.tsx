
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
import type { StoryResultPayload } from "@/app/actions";
import { useUser, useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }).max(500, { message: "Prompt must be 500 characters or less." }),
});

export default function Home() {
  const [generationResult, setGenerationResult] = useState<Omit<StoryResultPayload, 'error'> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    setGenerationResult(null);

    const result = await generateStory(values.prompt);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error,
        duration: 9000,
      });
    } else {
      setGenerationResult(result);
       toast({
        title: "Generation Complete!",
        description: "Your story has been generated.",
      });
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto space-y-8 w-full">
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-50">
            Story Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter a prompt and let AI bring it to life.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Story</CardTitle>
            <CardDescription>Enter a prompt and let AI bring it to life.</CardDescription>
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
                          className="resize-none"
                          rows={3}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading || isUserLoading} className="w-full">
                   {isLoading ? 'Generating...' : 'Generate Story'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {generationResult && (
           <Card>
             <CardHeader>
               <CardTitle>Result</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div>
                    <h3 className="font-semibold">Script:</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{generationResult.script}</p>
                </div>
                 <div>
                    <h3 className="font-semibold">Visual:</h3>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={generationResult.imageUrl} alt="Generated visual" className="rounded-md w-full" />
                </div>
                 <div>
                    <h3 className="font-semibold">Voiceover:</h3>
                    <audio controls src={generationResult.audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </div>
             </CardContent>
           </Card>
        )}
      </div>
    </main>
  );
}
