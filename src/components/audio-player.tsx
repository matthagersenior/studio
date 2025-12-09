"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Rewind } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export function AudioPlayer({ src, autoPlay = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", onEnded);

    if (autoPlay) {
      audio.play().catch(e => {
        // Autoplay was prevented.
        console.error("Audio autoplay failed.", e);
        setIsPlaying(false);
      });
    }

    return () => {
      audio.removeEventListener("ended", onEnded);
    };
  }, [src, autoPlay]);
  
  useEffect(() => {
    if (audioRef.current) {
        setIsPlaying(autoPlay);
    }
  }, [autoPlay]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If we are at the end, rewind before playing.
      if (audio.currentTime >= audio.duration) {
          audio.currentTime = 0;
      }
      audio.play().catch(e => console.error("Audio play failed", e));
    }
    setIsPlaying(!isPlaying);
  };
  
  const rewind = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (!isPlaying) {
          togglePlayPause(); // Will start playing from the beginning
        }
    }
  };
  
  return (
    <div 
      className="bg-transparent text-white p-3 rounded-lg w-full flex items-center justify-center gap-2"
      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
    >
      <audio ref={audioRef} src={src} preload="auto" />
      <Button onClick={togglePlayPause} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full h-12 w-12">
        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
      </Button>
      <Button onClick={rewind} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full h-12 w-12">
          <Rewind className="h-7 w-7 fill-current" />
      </Button>
    </div>
  );
}
