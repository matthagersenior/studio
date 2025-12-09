"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Rewind } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(({ src, autoPlay = false }, ref) => {
  const internalAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = (ref || internalAudioRef) as React.RefObject<HTMLAudioElement>;
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    if (autoPlay) {
      audio.play().catch(e => {
        console.error("Audio autoplay failed.", e);
        setIsPlaying(false);
      });
    }

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src, autoPlay, audioRef]);
  
  useEffect(() => {
    if (audioRef.current) {
        setIsPlaying(autoPlay);
    }
  }, [autoPlay, audioRef]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Audio play failed", e));
    }
    setIsPlaying(!isPlaying);
  };
  
  const rewind = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (!isPlaying) {
          audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }
  };
  
  return (
    <div 
      className="bg-transparent text-white p-3 rounded-lg w-full flex items-center justify-center gap-2"
      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
    >
      <audio ref={audioRef} src={src} preload="auto" loop />
      <Button onClick={togglePlayPause} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full h-12 w-12">
        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
      </Button>
      <Button onClick={rewind} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full h-12 w-12">
          <Rewind className="h-7 w-7 fill-current" />
      </Button>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';
