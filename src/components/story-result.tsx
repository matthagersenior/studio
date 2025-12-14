
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  imageUrl: string;
  audioUrl: string;
  onReset: () => void;
}

export function StoryResult({ script, imageUrl, audioUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Autoplay and setup logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;
    audio.loop = true; // Loop the audio
    
    const attemptPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Autoplay was prevented:', error);
        setIsPlaying(false);
        setIsMuted(true); 
      }
    };
    
    audio.muted = isMuted;

    const handleCanPlay = () => {
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setMediaDuration(audio.duration);
      }
      attemptPlay();
    };
    
    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [audioUrl, isMuted]); // depend on isMuted

  const playMedia = () => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Media play failed:", e));
  };

  const pauseMedia = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handlePlayPauseToggle = () => {
    if (isPlaying) {
      pauseMedia();
    } else {
      playMedia();
    }
  };
  
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if(audioRef.current) {
        audioRef.current.muted = newMutedState;
    }
    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };


  return (
    <TooltipProvider>
      <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
        <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
          
          {imageUrl && (
             <Image 
                key={imageUrl} // Force re-render on image change to restart animation
                src={imageUrl}
                alt="Generated visual"
                fill
                className="object-cover w-full h-full animate-kenburns"
            />
          )}
          <audio ref={audioRef} playsInline />
          
          <div className="absolute inset-x-0 bottom-0 h-2/5 p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end">
             <div className="pointer-events-auto text-center text-white font-semibold text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
