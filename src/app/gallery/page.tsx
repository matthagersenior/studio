
'use client';

import { useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Loader2, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/firebase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StoryResult } from '@/components/story-result';
import { useState } from 'react';


interface GeneratedContent {
    id: string;
    prompt: string;
    storyScript: string;
    visualUrl: string;
    voiceoverUrl: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
}


export default function GalleryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [selectedStory, setSelectedStory] = useState<GeneratedContent | null>(null);

  const contentCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/generatedContent`);
  }, [user]);

  const { data: stories, isLoading } = useCollection<GeneratedContent>(contentCollectionRef);
  
  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Sort stories by creation date, newest first
  const sortedStories = stories?.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  const onReset = () => {
    const dialogClose = document.querySelector('[data-radix-dialog-close]') as HTMLElement | null;
    if (dialogClose) {
      dialogClose.click();
    }
  }
  
  const calculateAudioDuration = (voiceoverUrl: string) => {
    try {
        const base64part = voiceoverUrl.substring(voiceoverUrl.indexOf(',') + 1);
        const binaryString = atob(base64part);
        const pcmDataLength = binaryString.length;
        
        const sampleRate = 24000;
        const bitDepth = 16;
        const channels = 1;
        
        return pcmDataLength / (sampleRate * (bitDepth / 8) * channels);
    } catch (e) {
        console.error("Error calculating audio duration:", e);
        return 10; // return a default duration
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && setSelectedStory(null)}>
        <main className="min-h-screen w-full bg-black text-white p-4 sm:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold font-headline">My Gallery</h1>
            <div className="flex gap-2">
                <Link href="/">
                    <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                    <Home className="mr-2 h-5 w-5" /> Home
                    </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                    <LogOut className="mr-2 h-5 w-5" /> Logout
                </Button>
            </div>
        </div>

        {sortedStories && sortedStories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedStories.map((story) => (
                <DialogTrigger key={story.id} asChild onClick={() => setSelectedStory(story)}>
                    <Card className="bg-gray-900 border-gray-700 hover:border-blue-500 cursor-pointer transition-all overflow-hidden group">
                        <CardContent className="p-0">
                            <div className="aspect-video relative overflow-hidden">
                                <video
                                    src={`${story.visualUrl}&key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    muted
                                    playsInline
                                    onMouseOver={e => e.currentTarget.play()}
                                    onMouseOut={e => e.currentTarget.pause()}
                                    loop
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            </div>
                            <div className="p-4">
                                <p className="font-semibold truncate" title={story.prompt}>{story.prompt}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                {new Date(story.createdAt.seconds * 1000).toLocaleDateString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
            ))}
            </div>
        ) : (
            <div className="text-center py-20">
                <p className="text-gray-400 text-lg">You haven't created any stories yet.</p>
                <Link href="/">
                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700">Create Your First Story</Button>
                </Link>
            </div>
        )}
        
        {selectedStory && (
            <DialogContent className="max-w-none w-screen h-screen sm:w-auto sm:h-auto p-0 border-0 bg-black">
                <StoryResult 
                    script={selectedStory.storyScript} 
                    visualUrl={selectedStory.visualUrl} 
                    voiceoverMedia={selectedStory.voiceoverUrl} 
                    audioDuration={calculateAudioDuration(selectedStory.voiceoverUrl)}
                    onReset={onReset} 
                />
                 <DialogClose asChild>
                    <button data-radix-dialog-close className="hidden"></button>
                </DialogClose>
            </DialogContent>
        )}
        </main>
    </Dialog>
  );
}
