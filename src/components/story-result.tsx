
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause, Download } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface StoryResultProps {
  script: string;
  videoUrl?: string;
  audioUrl?: string;
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false); // Do not mute by default
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Effect to load media sources and handle metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (videoUrl) video.src = videoUrl;
    if (audioUrl) {
      // If there's a separate audio URL, we can create an Audio object to play alongside
      // But for veo-generated video with audio, this is not needed.
      // For simplicity with VEO, we'll assume audio is baked in.
      // If audio is separate, we need a separate audio element.
    }

    const handleMetadata = () => {
      if (video && video.duration > 0 && isFinite(video.duration)) {
        setMediaDuration(video.duration);
      }
    };
    
    video.addEventListener('loadedmetadata', handleMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [videoUrl, audioUrl]);

  // Autoplay logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlay = async () => {
        try {
            await video.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Autoplay was prevented:', error);
            setIsPlaying(false); 
            // If autoplay with sound fails, we can try muted autoplay
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(e => console.error("Muted autoplay failed too", e));
        }
    };
    
    // We don't set video.muted = true here anymore. Let's try unmuted first.
    video.muted = isMuted;

    const handleCanPlay = () => {
        attemptPlay();
    };

    video.addEventListener('canplaythrough', handleCanPlay, { once: true });
    
    return () => {
      video.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [videoUrl, isMuted]); // Depend on isMuted to re-trigger if user unmutes.


  const playMedia = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.play().catch(e => console.error("Video play failed:", e));
    setIsPlaying(true);
  };

  const pauseMedia = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
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
    if (videoRef.current) videoRef.current.muted = newMutedState;

    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      // VEO urls don't have extensions, so we need to add one.
      // It's an MP4.
      a.download = `brain-rot-${Date.now()}.mp4`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <TooltipProvider>
      <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
        <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
          
          {videoUrl && (
             <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                loop
                className="w-full h-full object-cover"
            />
          )}
          
          <div className="absolute inset-x-0 bottom-0 h-2/5 p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none flex flex-col justify-end">
             <div
              className="w-full text-center text-white font-semibold text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-auto"
            >
              <KaraokeScript
                script={script}
                mediaRef={videoRef}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full pointer-events-auto">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Mute</p>
              </TooltipContent>
            </Tooltip>

            <Button onClick={handlePlayPauseToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12 pointer-events-auto">
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </Button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleDownload} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full pointer-events-auto" disabled={!videoUrl}>
                  <Download size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download Video</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
