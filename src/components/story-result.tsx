
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to initialize the video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    // Attempt to play the video once it's ready
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.error("Video autoplay was prevented.", e);
            // If autoplay is blocked, the user will need to interact to start.
            // The mute/unmute button will serve this purpose.
        });
    }

    // Cleanup function to run when the component unmounts or videoUrl changes
    return () => {
        if(video) {
            video.pause();
            video.removeAttribute('src'); // Free up memory
            video.load();
        }
    };
  }, [videoUrl]);

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !video.muted;
    video.muted = newMutedState;
    setIsMuted(newMutedState);

    // If we are unmuting, ensure the video is playing
    if (!newMutedState && video.paused) {
        video.play().catch(e => console.error("Could not play video on unmute:", e));
    }
  };
  
  const handleMediaMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const newDuration = e.currentTarget.duration;
    if (newDuration > 0) {
      setMediaDuration(newDuration);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      {/* Aspect ratio container for mobile and desktop */}
      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        {videoUrl && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              loop
              muted
              autoPlay
              onLoadedMetadata={handleMediaMetadata}
            />
        )}

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
