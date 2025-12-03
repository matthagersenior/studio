"use client";

import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface StoryResultProps {
  script: string;
  visualDataUri: string;
  voiceoverMedia: string;
  onReset: () => void;
}

export function StoryResult({ script, visualDataUri, voiceoverMedia, onReset }: StoryResultProps) {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      {/* 
        Responsive Layout:
        - Mobile (default): A column layout (flex-col) to stack image, script, and player.
        - Medium screens and up (md:): The original overlay layout inside a 16:9 container.
      */}
      <div className="w-full max-w-4xl h-full flex flex-col md:aspect-[16/9] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        
        {/* Image Container */}
        <div className="relative w-full aspect-[16/9] md:h-full rounded-lg overflow-hidden shrink-0">
          <Image
            src={visualDataUri}
            alt="Generated cinematic visual"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 70vw"
          />
        </div>

        {/* Script Text */}
        <div 
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          {/* ScrollArea for mobile view to handle long text */}
          <ScrollArea className="h-full md:h-auto">
            <div className="p-2 md:p-0">
              {script}
            </div>
          </ScrollArea>
        </div>

        {/* Audio Player */}
        <div className="w-full mt-auto md:absolute md:top-4 md:left-4 md:right-4 md:mt-0 md:w-auto">
            <AudioPlayer src={voiceoverMedia} />
        </div>

        {/* Reset Button */}
        <div className="text-center py-2 md:absolute md:bottom-4 md:right-4 md:py-0">
            <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
                ROTTEN ENOUGH (Start Over)
            </Button>
        </div>
      </div>
    </div>
  );
}
