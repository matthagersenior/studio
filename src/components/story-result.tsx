"use client";

import { AudioPlayer } from "./audio-player";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useState } from "react";

interface StoryResultProps {
  script: string;
  visualUrl: string;
  voiceoverMedia: string;
  onReset: () => void;
}

export function StoryResult({ script, visualUrl, voiceoverMedia, onReset }: StoryResultProps) {
  const [startPlayback, setStartPlayback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setStartPlayback(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-full flex flex-col md:aspect-[16/9] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        
        <div className="relative w-full aspect-[16/9] md:h-full rounded-lg overflow-hidden shrink-0">
          <video
            src={visualUrl}
            className="object-cover w-full h-full"
            autoPlay
            loop
            muted
            playsInline
          />
           <div className="md:hidden absolute inset-0 bg-black/30 flex items-center justify-center">
            <AudioPlayer src={voiceoverMedia} autoPlay={startPlayback} />
          </div>
        </div>

        <div 
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          <ScrollArea className="h-full md:h-auto">
            <div className="p-2 md:p-0">
              {script}
            </div>
          </ScrollArea>
        </div>

        <div className="w-full mt-auto hidden md:flex md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:mt-0 md:w-auto">
            <AudioPlayer src={voiceoverMedia} autoPlay={startPlayback} />
        </div>

        <div className="text-center py-2 md:absolute md:bottom-4 md:right-4 md:py-0">
            <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
                ROTTEN ENOUGH
            </Button>
        </div>
      </div>
    </div>
  );
}
