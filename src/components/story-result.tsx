"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  audioUrl: string;
  videoUrl?: string;
  videoUrls?: string[];
  imageUrls?: string[];
  onReset: () => void;
}

export function StoryResult({ script, audioUrl, videoUrl, videoUrls, imageUrls, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  
  const [isMuted, setIsMuted] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);

  const allVideos = videoUrl ? [videoUrl] : videoUrls || [];
  const isImageSequence = imageUrls && imageUrls.length > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = audioUrl;
    audio.muted = isMuted;

    const playMedia = async () => {
      try {
        // Unmute before playing to ensure Safari plays audio with video
        if (videoRef.current) {
          videoRef.current.muted = false; 
        }
        await audio.play();
        if (videoRef.current) {
          videoRef.current.play();
        }
      } catch (e) {
        console.error("Autoplay was prevented. User interaction needed.", e);
        setIsMuted(true); 
         if (videoRef.current) {
          videoRef.current.muted = true;
        }
      }
    };
    
    // Delay play to allow media to load
    const timer = setTimeout(playMedia, 100);


    const handleTimeUpdate = () => {
      if (!audioDuration) return;

      const visualAssets = isImageSequence ? imageUrls : allVideos;
      if (!visualAssets || visualAssets.length <= 1) return;

      const progress = audio.currentTime / audioDuration;
      const newIndex = Math.floor(progress * visualAssets.length);
      
      if (newIndex !== currentVisualIndex) {
        setCurrentVisualIndex(newIndex);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      clearTimeout(timer);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };

  }, [audioUrl, isMuted, allVideos, imageUrls, isImageSequence, audioDuration, currentVisualIndex]);


  useEffect(() => {
    const video = videoRef.current;
    if (video && allVideos[currentVisualIndex]) {
        // If the source is different, update and play
        if (video.currentSrc !== allVideos[currentVisualIndex]) {
            video.src = allVideos[currentVisualIndex];
            video.load(); // Important for changing source
            video.play().catch(e => console.error("Could not play video clip.", e));
        } else if (video.paused) {
            // If same source but paused (e.g., after seeking), play it
            video.play().catch(e => console.error("Could not resume video clip.", e));
        }
    }
  }, [currentVisualIndex, allVideos]);


  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.muted = newMutedState;
    }
    if (videoRef.current) {
        videoRef.current.muted = newMutedState;
    }
     if (audioRef.current && !newMutedState && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.error("Could not play audio on unmute.", e));
      }
  };
  
  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const isLoopingVideo = allVideos.length === 1;

  const renderVisuals = () => {
    if (isImageSequence && imageUrls) {
      return (
        <Image
          key={imageUrls[currentVisualIndex]}
          src={imageUrls[currentVisualIndex]}
          alt="Generated story visual"
          fill
          className="object-cover"
          unoptimized
        />
      );
    }
    
    if (allVideos.length > 0) {
       return (
        <video
          ref={videoRef}
          key={allVideos[currentVisualIndex]}
          className="absolute top-0 left-0 w-full h-full object-cover"
          loop={isLoopingVideo}
          muted={isMuted} // Sync with the central mute state
          playsInline
          autoPlay
          src={allVideos[currentVisualIndex]} // Set initial src
        />
      );
    }

    return null;
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        loop={isLoopingVideo || (isImageSequence && imageUrls && imageUrls.length > 0)}
        playsInline
        muted={isMuted}
        onLoadedMetadata={handleAudioMetadata}
        onEnded={() => {
            if (!isLoopingVideo && !isImageSequence) {
                // Logic for when a sequence of videos ends
                setCurrentVisualIndex(0); // Optional: Reset to beginning
            }
        }}
      />
      <div className="w-full max-w-sm h-full flex flex-col md:aspect-[9/16] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        <div className="relative w-full aspect-[9/16] md:h-full rounded-lg overflow-hidden shrink-0 bg-black">
          {renderVisuals()}
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
