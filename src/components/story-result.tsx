
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StoryResultProps {
  script: string;
  audioUrl: string;
  imageUrl: string;
  onReset: () => void;
}

export function StoryResult({ script, audioUrl, imageUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Autoplay and setup logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;

    const attemptPlay = async () => {
      try {
        audio.muted = isMuted; // Reflect user's mute choice
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Autoplay was prevented:', error);
        setIsPlaying(false);
        setIsMuted(true); // Mute to allow showing controls to unmute and play
      }
    };

    const handleCanPlay = () => {
        if (audio.duration > 0 && isFinite(audio.duration)) {
            setMediaDuration(audio.duration);
        }
        attemptPlay();
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [audioUrl, isMuted]);


  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted]);

  const handlePlayPauseToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Media play failed:", e));
    }
  };
  
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    // If user unmutes and it's paused, start playing.
    if (!newMutedState && !isPlaying) {
        audioRef.current?.play().then(() => setIsPlaying(true));
    }
  };

  return (
    <TooltipProvider>
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

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

          <audio ref={audioRef} playsInline loop />
          
          <div className="absolute inset-x-0 bottom-0 h-2/5 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end">
             <div className="pointer-events-auto text-center text-white font-semibold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <KaraokeScript
                    script={script}
                    mediaRef={audioRef}
                    mediaDuration={mediaDuration}
                />
             </div>
          </div>
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
                  ROTTEN ENOUGH
              </Button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-center items-center z-10 space-x-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full pointer-events-auto">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Mute</p>
              </TooltipContent>
            </Tooltip>

            <Button onClick={handlePlayPauseToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12 pointer-events-auto">
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
