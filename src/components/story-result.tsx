"use client";

import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import { Button } from "./ui/button";

interface StoryResultProps {
  script: string;
  visualDataUri: string;
  voiceoverMedia: string;
  onReset: () => void;
}

export function StoryResult({ script, visualDataUri, voiceoverMedia, onReset }: StoryResultProps) {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl aspect-[16/9] rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/20">
        <Image
          src={visualDataUri}
          alt="Generated cinematic visual"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div 
          className="absolute bottom-0 left-0 right-0 p-8 text-center text-white font-semibold text-lg"
          style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))', textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          {script}
        </div>
        <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4">
            <AudioPlayer src={voiceoverMedia} />
        </div>
        <Button onClick={onReset} className="absolute bottom-4 right-4 text-xs underline" variant="link">
            ROTTEN ENOUGH (Start Over)
        </Button>
      </div>
    </div>
  );
}
