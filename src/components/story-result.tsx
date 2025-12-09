"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl: string;
  audioUrl: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && audio) {
        const playMedia = () => {
            // Muted is necessary for video autoplay in most browsers
            video.muted = true;
            video.play().catch(e => console.error("Video autoplay failed", e));
            
            // Unmute the audio element and play it
            audio.muted = false;
            audio.play().catch(e => {
                console.error("Audio autoplay failed, trying again on interaction", e);
                // Fallback for browsers that block audio autoplay
                setIsMuted(true);
                video.muted = true;
            });
        };
        
        playMedia();
    }
  }, [videoUrl, audioUrl]);
  
  const handleMuteToggle = () => {
      const audio = audioRef.current;
      if (audio) {
          audio.muted = !audio.muted;
          setIsMuted(audio.muted);
      }
  }

  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay
        loop
        muted={isMuted}
        onLoadedMetadata={handleAudioMetadata}
      />
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
