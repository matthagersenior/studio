"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";

interface StoryResultProps {
  script: string;
  audioUrl: string;
  videoUrl?: string;
  videoUrls?: string[];
  onReset: () => void;
}

export function StoryResult({ script, audioUrl, videoUrl, videoUrls, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  const [isMuted, setIsMuted] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);

  const allVideos = videoUrl ? [videoUrl] : videoUrls || [];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = audioUrl;
    audio.muted = isMuted;

    const playMedia = async () => {
      try {
        await audio.play();
        if (videoRef.current) {
          videoRef.current.play();
        }
      } catch (e) {
        console.error("Autoplay was prevented. User interaction needed.", e);
        setIsMuted(true); 
      }
    };
    playMedia();

    const handleTimeUpdate = () => {
      if (!allVideos || allVideos.length <= 1 || !audioDuration) return;

      const progress = audio.currentTime / audioDuration;
      const newIndex = Math.floor(progress * allVideos.length);
      
      if (newIndex !== currentVideoIndex) {
        setCurrentVideoIndex(newIndex);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };

  }, [audioUrl, isMuted, allVideos, audioDuration, currentVideoIndex]);

  useEffect(() => {
    if (videoRef.current && allVideos[currentVideoIndex]) {
      videoRef.current.src = allVideos[currentVideoIndex];
      videoRef.current.play().catch(e => console.error("Could not play video clip.", e));
    }
  }, [currentVideoIndex, allVideos]);

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.muted = newMutedState;
      if (!newMutedState && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.error("Could not play audio on unmute.", e));
      }
    }
  };
  
  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const isLooping = allVideos.length === 1;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        loop={isLooping}
        playsInline
        muted={isMuted}
        onLoadedMetadata={handleAudioMetadata}
      />
      <div className="w-full max-w-sm h-full flex flex-col md:aspect-[9/16] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        <div className="relative w-full aspect-[9/16] md:h-full rounded-lg overflow-hidden shrink-0 bg-black">
          <video
            ref={videoRef}
            key={allVideos[currentVideoIndex]}
            className="absolute top-0 left-0 w-full h-full object-cover"
            loop={isLooping}
            muted
            playsInline
            autoPlay
          />
        </div>

        <div
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          <KaraokeScript
            script={script}
            mediaRef={audioRef}
            mediaDuration={audioDuration}
          />
        </div>

        <div className="absolute top-4 right-4 z-10">
          <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </div>

        <div className="text-center py-2 md:absolute md:bottom-4 md:right-4 md:py-0 z-10">
          <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
            ROTTEN ENOUGH
          </Button>
        </div>
      </div>
    </div>
  );
}
