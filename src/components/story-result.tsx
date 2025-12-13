
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl?: string;
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to initialize media and sync playback
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio || !videoUrl || !audioUrl) return;

    // Set sources
    video.src = videoUrl;
    audio.src = audioUrl;

    // Mute video element, audio is controlled by the audio element
    video.muted = true; 
    video.loop = true;
    video.playsInline = true;

    audio.loop = true;
    audio.muted = isMuted;

    const playMedia = () => {
        // Play both, promises are handled
        const videoPromise = video.play();
        const audioPromise = audio.play();
        
        if (videoPromise !== undefined) {
            videoPromise.catch(e => console.error("Video autoplay failed:", e));
        }
        if (audioPromise !== undefined) {
            audioPromise.catch(e => console.error("Audio autoplay failed:", e));
        }
    };
    
    // Sync logic
    const syncTime = () => {
        if (Math.abs(video.currentTime - audio.currentTime) > 0.1) {
            audio.currentTime = video.currentTime;
        }
    };

    video.addEventListener('play', playMedia);
    video.addEventListener('timeupdate', syncTime);

    playMedia();

    // Cleanup function
    return () => {
      if (video) {
        video.removeEventListener('play', playMedia);
        video.removeEventListener('timeupdate', syncTime);
        video.pause();
        video.removeAttribute('src');
      }
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
    };
  }, [videoUrl, audioUrl]);


  const handleMuteToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newMutedState = !audio.muted;
    setIsMuted(newMutedState);
    audio.muted = newMutedState;

    // If unmuting, might need to replay to satisfy browser policy
    if (!newMutedState && (audio.paused || videoRef.current?.paused)) {
        videoRef.current?.play().catch(e => console.error("Video play failed on unmute:", e));
        audio.play().catch(e => console.error("Audio play failed on unmute:", e));
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
       <audio ref={audioRef} playsInline />
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
