
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl?: string; // This will be an image URL
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to load media sources and handle metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) audio.src = audioUrl;

    const handleMetadata = () => {
      if (audio && audio.duration > 0 && isFinite(audio.duration)) {
        setMediaDuration(audio.duration);
      }
    };
    
    audio?.addEventListener('loadedmetadata', handleMetadata);
    
    return () => {
      audio?.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [audioUrl]);

  // Autoplay logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const attemptPlay = async () => {
        try {
            await audio.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Autoplay was prevented:', error);
            setIsPlaying(false); // Ensure state is correct if autoplay fails
        }
    };
    
    // Muted autoplay is more likely to succeed
    audio.muted = true;
    setIsMuted(true);

    const handleCanPlay = () => {
      if (audio.readyState >= 3) {
          attemptPlay();
          audio.removeEventListener('canplaythrough', handleCanPlay);
      }
    };
    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // Check initial state in case they are already ready
    if (audio.readyState >= 3) {
      attemptPlay();
    }
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [audioUrl]);


  const playMedia = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.play().catch(e => console.error("Audio play failed:", e));
    setIsPlaying(true);
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

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <audio ref={audioRef} loop />
      
      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        
        {videoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={videoUrl}
            alt="Generated story visual"
            className="w-full h-full object-cover animate-kenburns"
          />
        )}
        
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
           <div
            className="w-full text-center text-white font-semibold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
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
          <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full pointer-events-auto">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
          <Button onClick={handlePlayPauseToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12 pointer-events-auto">
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
