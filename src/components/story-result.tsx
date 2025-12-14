
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
        setCurrentImageIndex(0); // Reset slideshow
        audio.play(); // Loop
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

    const intervalTime = Math.max(1000, mediaDuration * 1000 / imageUrls.length);
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
        // Play was likely interrupted or blocked by the browser.
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
    // If unmuting and not already playing, start playback.
    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };

  // Autoplay on mount when ready
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
  
    // Function to attempt playing the media
    const attemptPlay = () => {
      if (audio.muted) { // Autoplay is more likely to succeed if muted
        const playPromise = audio.play();
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('Autoplay was prevented:', error);
          setIsPlaying(false); // Ensure state is correct if autoplay fails
        });
      }
    };
  
    // Check if the audio is ready to play
    if (audio.readyState >= 3) { // HAVE_FUTURE_DATA
      attemptPlay();
    } else {
      // If not ready, listen for the 'canplaythrough' event
      const handleCanPlay = () => {
        attemptPlay();
        audio.removeEventListener('canplaythrough', handleCanPlay); // Clean up listener
      };
      audio.addEventListener('canplaythrough', handleCanPlay);
  
      return () => {
        audio.removeEventListener('canplaythrough', handleCanPlay);
      };
    }
  }, [audioUrl]);


  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <audio ref={audioRef} muted playsInline loop />

      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        
        {imageUrls && imageUrls.length > 0 && (
          <Image
            key={currentImageIndex} // Force re-render on change
            src={imageUrls[currentImageIndex]}
            alt="Generated story visual"
            fill
            className="object-cover animate-kenburns"
            priority={true}
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
