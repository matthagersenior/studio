
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl?: string;
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to load media sources and handle metadata
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && videoUrl) video.src = videoUrl;
    if (audio && audioUrl) audio.src = audioUrl;

    const sourceToUse = videoUrl && video ? video : audio;

    const handleMetadata = () => {
      if (sourceToUse && sourceToUse.duration > 0 && isFinite(sourceToUse.duration)) {
        setMediaDuration(sourceToUse.duration);
      }
    };
    
    sourceToUse?.addEventListener('loadedmetadata', handleMetadata);
    
    return () => {
      sourceToUse?.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [videoUrl, audioUrl]);

  // Autoplay logic
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const attemptPlay = async () => {
        try {
            await Promise.all([video.play(), audio.play()]);
            setIsPlaying(true);
        } catch (error) {
            console.error('Autoplay was prevented:', error);
            setIsPlaying(false); // Ensure state is correct if autoplay fails
        }
    };
    
    // Muted autoplay is more likely to succeed
    video.muted = true;
    audio.muted = true;
    setIsMuted(true);

    const canPlayVideo = video.readyState >= 3;
    const canPlayAudio = audio.readyState >= 3;

    if (canPlayVideo && canPlayAudio) {
      attemptPlay();
    } else {
      const handleCanPlay = () => {
        if (video.readyState >=3 && audio.readyState >= 3) {
            attemptPlay();
            video.removeEventListener('canplaythrough', handleCanPlay);
            audio.removeEventListener('canplaythrough', handleCanPlay);
        }
      };
      video.addEventListener('canplaythrough', handleCanPlay);
      audio.addEventListener('canplaythrough', handleCanPlay);
      
      return () => {
        video.removeEventListener('canplaythrough', handleCanPlay);
        audio.removeEventListener('canplaythrough', handleCanPlay);
      };
    }
  }, [videoUrl, audioUrl]);


  const playMedia = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    
    video.play().catch(e => console.error("Video play failed:", e));
    audio.play().catch(e => console.error("Audio play failed:", e));
    setIsPlaying(true);
  };

  const pauseMedia = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    video.pause();
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
    if (videoRef.current) videoRef.current.muted = newMutedState;
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
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            playsInline
            className="w-full h-full object-cover"
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
