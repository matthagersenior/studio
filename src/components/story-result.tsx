"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

interface StoryResultProps {
  script: string;
  videoUrl: string | null;
  imageUrls: string[] | null;
  audioUrl: string;
  onReset: () => void;
  isGeneratingVideo: boolean;
}

export function StoryResult({ script, videoUrl, imageUrls, audioUrl, onReset, isGeneratingVideo }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Attempt to play audio when the component mounts and url is available
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      audio.src = audioUrl;
      audio.play().catch(e => {
        console.error("Audio autoplay was prevented. Muting to allow user interaction.", e);
        setIsMuted(true);
      });
    }
  }, [audioUrl]);

  // Sync video playback with audio
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video && audio) {
      const syncPlayback = () => {
        if (!video.src) return;
        if (audio.paused) video.pause();
        else video.play();
      };
      audio.addEventListener('play', syncPlayback);
      audio.addEventListener('pause', syncPlayback);

      if (videoUrl) {
        syncPlayback();
      }

      return () => {
        audio.removeEventListener('play', syncPlayback);
        audio.removeEventListener('pause', syncPlayback);
      };
    }
  }, [videoUrl]);

  // Handle image sequence display
  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0 || !audioDuration) return;
    const audio = audioRef.current;
    if (!audio) return;

    const intervalDuration = (audioDuration / imageUrls.length) * 1000;
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % imageUrls.length);
    }, intervalDuration);

    const handleAudioEnd = () => setCurrentImageIndex(0);
    audio.addEventListener('ended', handleAudioEnd);

    return () => {
      clearInterval(interval);
      audio.removeEventListener('ended', handleAudioEnd);
    };
  }, [imageUrls, audioDuration]);

  const handleMuteToggle = () => {
    const audio = audioRef.current;
    if (audio) {
      const newMutedState = !isMuted;
      audio.muted = newMutedState;
      setIsMuted(newMutedState);
      if (!newMutedState && audio.paused) {
        audio.play().catch(e => console.error("Could not play audio on unmute.", e));
      }
    }
  };

  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        autoPlay
        loop
        muted={isMuted}
        onLoadedMetadata={handleAudioMetadata}
        playsInline
      />
      <div className="w-full max-w-sm h-full flex flex-col md:aspect-[9/16] md:h-auto md:relative md:rounded-xl md:overflow-hidden md:shadow-2xl md:shadow-primary/20 md:border md:border-primary/20">
        <div className="relative w-full aspect-[9/16] md:h-full rounded-lg overflow-hidden shrink-0 bg-black">
          {(isGeneratingVideo) && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white text-center p-4">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div>
              <p className="mt-4 text-lg font-mono">Generating visuals...</p>
              <p className="mt-2 text-sm text-gray-400">Video is in high demand, we may generate images instead.</p>
            </div>
          )}

          {videoUrl && (
            <video
              ref={videoRef}
              key={videoUrl}
              className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${isGeneratingVideo ? 'opacity-0' : 'opacity-100'}`}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          )}
          
          {imageUrls && imageUrls.length > 0 && (
            <div className="w-full h-full">
              {imageUrls.map((url, index) => (
                <Image
                  key={index}
                  src={url}
                  alt={`Generated image ${index + 1}`}
                  fill
                  className={`object-cover transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                  unoptimized
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
