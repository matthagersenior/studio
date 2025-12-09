"use client";

import { AudioPlayer } from "./audio-player";
import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import type { WordTimestamp } from "@/app/actions";
import { KaraokeScript } from "./karaoke-script";

interface StoryResultProps {
  script: string;
  videoUrl: string;
  voiceoverMedia: string;
  timestamps: WordTimestamp[];
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, voiceoverMedia, timestamps, onReset }: StoryResultProps) {
  const [startPlayback, setStartPlayback] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);


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
            key={videoUrl}
            className="absolute top-0 left-0 w-full h-full object-cover"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
           <div className="md:hidden absolute inset-0 bg-black/30 flex items-center justify-center">
            <AudioPlayer ref={audioRef} src={voiceoverMedia} autoPlay={startPlayback} />
          </div>
        </div>

        <div 
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
            <KaraokeScript 
              script={script}
              timestamps={timestamps}
              audioRef={audioRef}
            />
        </div>

        <div className="w-full mt-auto hidden md:flex md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:mt-0 md:w-auto">
            <AudioPlayer ref={audioRef} src={voiceoverMedia} autoPlay={startPlayback} />
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
