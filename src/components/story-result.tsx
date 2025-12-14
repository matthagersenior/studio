
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  imageUrls?: string[];
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, imageUrls, audioUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // This effect handles loading the media sources into the elements
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) audio.src = audioUrl;

    const handleAudioMetadata = () => {
      if (audio && audio.duration > 0 && isFinite(audio.duration)) {
        setMediaDuration(audio.duration);
      }
    };
    
    audio?.addEventListener('loadedmetadata', handleAudioMetadata);
    
    const handleAudioEnd = () => {
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    };
    audio?.addEventListener('ended', handleAudioEnd);

    return () => {
      audio?.removeEventListener('loadedmetadata', handleAudioMetadata);
      audio?.removeEventListener('ended', handleAudioEnd);
    };
  }, [audioUrl]);

  // Slideshow effect
  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0 || mediaDuration === 0 || !isPlaying) return;

    const intervalTime = mediaDuration * 1000 / imageUrls.length;
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % imageUrls.length);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [imageUrls, mediaDuration, isPlaying]);


  const playMedia = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.muted = false;
    setIsMuted(false);

    const audioPromise = audio.play();

    audioPromise.then(() => {
        setIsPlaying(true);
    }).catch(e => {
        console.error("Media play failed:", e);
        alert("Your browser blocked media from playing automatically. Please click the play button.");
        setIsPlaying(false);
    });
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
    if(audioRef.current) {
        audioRef.current.muted = newMutedState;
    }
    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <audio ref={audioRef} muted={isMuted} onCanPlay={() => playMedia()} />

      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        
        {imageUrls && imageUrls.length > 0 && (
          <Image
            key={currentImageIndex} // Force re-render on change
            src={imageUrls[currentImageIndex]}
            alt="Generated story visual"
            fill
            className="object-cover animate-kenburns"
          />
        )}
        
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
           <div
            className="w-full text-center text-white font-semibold text-lg"
            style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
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
          <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
          <Button onClick={handlePlayPauseToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12">
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
