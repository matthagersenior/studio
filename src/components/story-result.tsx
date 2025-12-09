"use client";

import { Button } from "./ui/button";
import { useEffect, useRef } from "react";
import { KaraokeScript } from "./karaoke-script";

interface StoryResultProps {
  script: string;
  videoUrl: string;
  duration: number;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, duration, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
        // Muted is necessary for autoplay in most browsers
        video.muted = true; 
        
        const playPromise = video.play();

        playPromise.catch(e => {
          console.error("Media autoplay failed", e)
        });
    }
  }, [videoUrl]);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm h-full flex flex-col md:aspect-[9/16] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        
        <div className="relative w-full aspect-[9/16] md:h-full rounded-lg overflow-hidden shrink-0">
          <video
            ref={videoRef}
            key={videoUrl}
            className="absolute top-0 left-0 w-full h-full object-cover"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        <div 
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          <KaraokeScript 
            script={script}
            videoDuration={duration}
            videoRef={videoRef}
          />
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
