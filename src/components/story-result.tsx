
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  imageUrl?: string;
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, imageUrl, audioUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to initialize media and play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;
    audio.loop = true;
    audio.muted = isMuted;

    // Attempt to play audio
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.error("Audio autoplay failed:", e);
        // Autoplay was prevented. The user needs to interact to start audio.
        // The mute toggle will handle this.
      });
    }

    return () => {
      // Cleanup
      audio.pause();
      audio.removeAttribute('src');
    };
  }, [audioUrl, isMuted]);

  const handleMuteToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newMutedState = !audio.muted;
    setIsMuted(newMutedState);
    audio.muted = newMutedState;

    // If unmuting, might need to replay to satisfy browser policy
    if (!newMutedState && audio.paused) {
        audio.play().catch(e => console.error("Audio play failed on unmute:", e));
    }
  };
  
  const handleMediaMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const newDuration = e.currentTarget.duration;
    if (newDuration > 0) {
      setMediaDuration(newDuration);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <audio ref={audioRef} onLoadedMetadata={handleMediaMetadata} playsInline />
      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Generated visual"
            fill
            className="w-full h-full object-cover"
            priority
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

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
              ROTTEN ENOUGH
          </Button>
          <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
