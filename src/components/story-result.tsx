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
  const [mediaDuration, setMediaDuration] = useState(0);

  const allVideos = videoUrl ? [videoUrl] : videoUrls || [];
  const isImageSequence = imageUrls && imageUrls.length > 0;

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    // Set sources
    audio.src = audioUrl;
    if (allVideos.length > 0) {
      video.src = allVideos[0];
    }
    
    // Mute/unmute based on state
    audio.muted = isMuted;
    video.muted = isMuted;

    const playMedia = async () => {
      try {
        await video.play();
        await audio.play();
      } catch (e) {
        console.error("Autoplay was prevented. User must interact.", e);
        setIsMuted(true);
        video.muted = true;
        audio.muted = true;
      }
    };
    
    // Delay play slightly to ensure media is ready
    const timer = setTimeout(playMedia, 150);

    const handleVideoTimeUpdate = () => {
      if (audio.paused && video.currentTime > 0) {
        audio.currentTime = video.currentTime;
        audio.play().catch(e => console.error("Audio sync play failed", e));
      }

      if (!mediaDuration) return;

      const visualAssets = isImageSequence ? imageUrls : allVideos;
      if (!visualAssets || visualAssets.length <= 1) return;

      const progress = video.currentTime / mediaDuration;
      const newIndex = Math.floor(progress * visualAssets.length);
      
      if (newIndex !== currentVisualIndex) {
        setCurrentVisualIndex(newIndex);
      }
    };

    video.addEventListener('timeupdate', handleVideoTimeUpdate);
    
    return () => {
      clearTimeout(timer);
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
    };

  }, [audioUrl, isMuted, allVideos, imageUrls, isImageSequence, mediaDuration, currentVisualIndex]);


  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video && allVideos[currentVisualIndex]) {
        if (video.currentSrc !== allVideos[currentVisualIndex]) {
            const currentTime = video.currentTime;
            video.src = allVideos[currentVisualIndex];
            video.load();
            video.play().then(() => {
              video.currentTime = currentTime;
              if (audio) audio.currentTime = currentTime;
            }).catch(e => console.error("Could not play video clip.", e));
        } else if (video.paused) {
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
     if (videoRef.current && !newMutedState && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Could not play video on unmute.", e));
      }
  };
  
  const handleMediaMetadata = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    // Use the longer of the two durations
    const newDuration = e.currentTarget.duration;
    if (newDuration > mediaDuration) {
      setMediaDuration(newDuration);
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
          key={allVideos[0]} // Key stays consistent
          className="absolute top-0 left-0 w-full h-full object-cover"
          loop={isLoopingVideo}
          muted={isMuted}
          playsInline
          autoPlay
          onLoadedMetadata={handleMediaMetadata}
          onEnded={() => {
              if (!isLoopingVideo && !isImageSequence) {
                  setCurrentVisualIndex(0);
              }
          }}
          src={allVideos[0]}
        />
      );
    }

    return null;
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0 md:p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        loop={isLoopingVideo || (isImageSequence && imageUrls && imageUrls.length > 0)}
        playsInline
        muted={isMuted}
        onLoadedMetadata={handleMediaMetadata}
      />
      <div className="w-full h-full flex flex-col md:aspect-[9/16] md:h-auto md:max-h-full md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        <div className="relative w-full flex-1 md:flex-none aspect-[9/16] bg-black">
          {renderVisuals()}

          {/* Overlay Container */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
             <div
              className="w-full text-center text-white font-semibold text-lg"
              style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
            >
              <KaraokeScript
                script={script}
                mediaRef={videoRef} 
                mediaDuration={mediaDuration}
              />
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>
          </div>
        </div>

        <div className="text-center py-2 bg-black md:bg-transparent md:absolute md:bottom-4 md:right-4 md:py-0 z-10">
          <Button onClick={onReset} className="text-xs underline text-white/80 hover:text-white" variant="link">
            ROTTEN ENOUGH
          </Button>
        </div>
      </div>
    </div>
  );
}
