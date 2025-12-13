
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
  onReset: () => void;
}

export function StoryResult({ script, audioUrl, videoUrl, onReset }: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = useState(true);
  const [mediaDuration, setMediaDuration] = useState(0);

  // This effect handles initializing and playing the media
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    // Set sources
    audio.src = audioUrl;
    if (videoUrl) {
      video.src = videoUrl;
    }

    const playMedia = async () => {
      // Always start the video muted to comply with autoplay policies
      video.muted = true;
      audio.muted = true;
      setIsMuted(true);

      try {
        await video.play();
        // We don't play the audio here, we sync it to the video's timeupdate
      } catch (e) {
        console.error("Video autoplay was prevented.", e);
      }
    };
    
    playMedia();

  }, [audioUrl, videoUrl]);


  // This effect handles syncing audio to video
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    const handleVideoTimeUpdate = () => {
      // Sync audio current time to video current time
      if (Math.abs(video.currentTime - audio.currentTime) > 0.1) {
        audio.currentTime = video.currentTime;
      }
      if (video.paused !== audio.paused) {
          if (video.paused) audio.pause();
          else audio.play().catch(e => console.error("Audio sync play failed", e));
      }
    };

    const handleVideoPlay = () => {
      audio.play().catch(e => console.error("Audio play on video sync failed.", e));
    };

    const handleVideoPause = () => {
      audio.pause();
    };

    const handleVideoEnded = () => {
      onReset(); // Go back to the main page when video finishes
    };
    
    video.addEventListener('timeupdate', handleVideoTimeUpdate);
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('ended', handleVideoEnded);
    };

  }, [onReset]);


  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.muted = newMutedState;
    }
    // The video should remain muted visually for the user to hear the synced audio
    if (videoRef.current) {
        videoRef.current.muted = true;
    }
    // If we are unmuting and the video is paused, play it.
     if (videoRef.current && !newMutedState && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Could not play video on unmute.", e));
      }
  };
  
  const handleMediaMetadata = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const newDuration = e.currentTarget.duration;
    // Use the video's duration as the source of truth
    if (e.currentTarget.tagName === 'VIDEO' && newDuration > 0) {
      setMediaDuration(newDuration);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <audio
        ref={audioRef}
        playsInline
        muted={isMuted}
      />
      {/* Aspect ratio container for mobile and desktop */}
      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          loop={false} 
          muted={true} // Video is always muted, audio comes from the <audio> element
          playsInline
          onLoadedMetadata={handleMediaMetadata}
        />

        {/* Overlay Container */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
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

        {/* Controls Overlay */}
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
