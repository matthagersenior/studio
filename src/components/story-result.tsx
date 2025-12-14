
"use client";

import { Button } from "./ui/button";
import Image from 'next/image';
import { ScrollArea } from "./ui/scroll-area";

interface StoryResultProps {
  script: string;
  imageUrl: string;
  onReset: () => void;
}

export function StoryResult({ script, imageUrl, onReset }: StoryResultProps) {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full h-full max-w-md aspect-[9/16] relative overflow-hidden bg-black rounded-xl shadow-2xl shadow-primary/20">
        
        <Image
          src={imageUrl}
          alt="Generated visual"
          fill
          className="object-cover animate-kenburns"
          priority
          unoptimized
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        <div className="absolute inset-x-0 bottom-0 h-2/5 p-8 flex flex-col justify-end">
           <ScrollArea className="h-full">
            <p className="text-center text-white font-semibold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-wrap">
              {script}
            </p>
           </ScrollArea>
        </div>
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
                ROTTEN ENOUGH
            </Button>
        </div>

      </div>
    </div>
  );
}
