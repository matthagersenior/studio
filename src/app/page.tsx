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
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    } else {
      setResult(response);
    }
    
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen w-full p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground font-headline">
            Brainrot Creator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate short, cinematic stories from a simple prompt.
          </p>
        </header>

        <Card className="bg-card/80 backdrop-blur-sm border-border/30 shadow-lg">
          <CardHeader>
            <CardTitle>Create Your Story</CardTitle>
            <CardDescription>Enter a prompt and let AI do the rest.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A lonely astronaut on Mars finds something unexpected."
                          className="resize-none bg-background/50"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full text-base font-semibold">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Story"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="bg-card/80 backdrop-blur-sm border-border/30 shadow-xl">
            <CardContent className="p-4 md:p-6">
              <div className="grid md:grid-cols-2 gap-6 items-start">
                  <Skeleton className="w-full aspect-square rounded-lg" />
                  <div className="space-y-4 flex flex-col h-full">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-full flex-grow w-full" />
                  </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && !result.error && (
          <StoryResult {...result} />
        )}
      </div>
    </main>
  );
}
