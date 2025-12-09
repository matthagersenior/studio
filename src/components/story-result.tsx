"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  audioUrl: string;
  videoUrl?: string | null;
  videoUrls?: string[] | null; // Can be video clips or image URLs
  onReset: () => void;
}

export function StoryResult({ script, audioUrl, videoUrl, videoUrls, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRef = useRef<HTMLAudioElement>(null);
  
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);

  // Combine audio and video refs for KaraokeScript
  useEffect(() => {
    if (audioRef.current) {
        (mediaRef as React.MutableRefObject<HTMLAudioElement | null>).current = audioRef.current;
    }
  }, []);
  
  // Effect to handle playing audio and video together
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  
    const playMedia = async () => {
      try {
        audio.src = audioUrl;
        await audio.play();
      } catch (e) {
        console.error("Autoplay was prevented. User interaction needed.", e);
        setIsMuted(true);
      }
    };
  
    playMedia();
  
  }, [audioUrl]);
  
  // Effect to sync visual sequence with audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !videoUrls || videoUrls.length === 0 || !audioDuration) return;
  
    const numVisuals = videoUrls.length;
    const intervalDuration = audioDuration / numVisuals;
  
    const handleTimeUpdate = () => {
      const newIndex = Math.min(numVisuals - 1, Math.floor(audio.currentTime / intervalDuration));
      if (newIndex !== currentVisualIndex) {
        setCurrentVisualIndex(newIndex);
      }
    };
  
    audio.addEventListener('timeupdate', handleTimeUpdate);
  
    return () => {
      if (audio) {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [videoUrls, audioDuration, currentVisualIndex]);

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

  const isImageSequence = videoUrls && videoUrls.every(url => url.startsWith('data:image'));

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        loop
        muted={isMuted}
        onLoadedMetadata={handleAudioMetadata}
        playsInline
      />
      <div className="w-full max-w-sm h-full flex flex-col md:aspect-[9/16] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        <div className="relative w-full aspect-[9/16] md:h-full rounded-lg overflow-hidden shrink-0 bg-black">
          {videoUrl && (
            <video
              key={videoUrl}
              className="absolute top-0 left-0 w-full h-full object-cover"
              src={videoUrl}
              loop
              muted // Video is always muted to sync with single audio source
              playsInline
              autoPlay
            />
          )}
          
          {videoUrls && videoUrls.length > 0 && !isImageSequence && (
            <div className="w-full h-full">
              {videoUrls.map((url, index) => (
                <video
                    key={url}
                    src={url}
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentVisualIndex ? 'opacity-100' : 'opacity-0'}`}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
              ))}
            </div>
          )}

          {isImageSequence && videoUrls && videoUrls.length > 0 && (
            <div className="w-full h-full">
              {videoUrls.map((url, index) => (
                <Image
                  key={url}
                  src={url}
                  alt={`Generated visual ${index + 1}`}
                  fill
                  className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentVisualIndex ? 'opacity-100' : 'opacity-0'}`}
                  priority={index === 0}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className="w-full text-center text-white font-semibold text-lg p-4 flex-grow min-h-0 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-8 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:flex-grow-0 md:min-h-0"
          style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
        >
          <KaraokeScript
            script={script}
            mediaRef={mediaRef}
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
