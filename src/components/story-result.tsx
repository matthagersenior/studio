
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause, Download } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image";


interface StoryResultProps {
  script: string;
  imageUrl?: string;
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, imageUrl, audioUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Autoplay logic - attempts to play audio when component can play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;

    const attemptPlay = async () => {
        try {
            await audio.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Autoplay was prevented:', error);
            setIsPlaying(false);
            // If autoplay with sound fails, we don't force mute.
            // The user must interact to start playback.
        }
    };
    
    audio.muted = isMuted;

    const handleCanPlay = () => {
      if (audio.duration > 0 && isFinite(audio.duration)) {
          setMediaDuration(audio.duration);
      }
      attemptPlay();
    };
    
    const handleEnded = () => {
        setIsPlaying(false);
        // Optional: loop
        if(audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().then(() => setIsPlaying(true));
        }
    };

    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, isMuted]);


  const playMedia = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Audio play failed:", e));
  };

  const pauseMedia = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
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
    if (audioRef.current) audioRef.current.muted = newMutedState;

    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `brain-rot-image-${Date.now()}.png`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <TooltipProvider>
      <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
        <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
          
          <audio ref={audioRef} playsInline />

          {imageUrl && (
             <Image
                src={imageUrl}
                alt="Generated story visual"
                fill
                className={`w-full h-full object-cover transition-transform duration-[5s] ease-out ${isPlaying ? 'animate-kenburns' : ''}`}
            />
          )}
          
          <div className="absolute inset-x-0 bottom-0 h-2/5 p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none flex flex-col justify-end">
             <div
              className="w-full text-center text-white font-semibold text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-auto"
            >
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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleDownload} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full pointer-events-auto" disabled={!imageUrl}>
                  <Download size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download Image</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
