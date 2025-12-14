
"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { KaraokeScript } from "./karaoke-script";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";

interface StoryResultProps {
  script: string;
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string; // No longer used for display, but kept for context if needed
  onReset: () => void;
}

export function StoryResult({ script, videoUrl, audioUrl, onReset }: StoryResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);

  // This effect handles loading the media sources into the elements
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && videoUrl) video.src = videoUrl;
    if (audio && audioUrl) audio.src = audioUrl;

    const handleAudioMetadata = () => {
      if (audio && audio.duration > 0 && isFinite(audio.duration)) {
        setMediaDuration(audio.duration);
      }
    };
    
    // Use the audio duration for the karaoke timing
    audio?.addEventListener('loadedmetadata', handleAudioMetadata);

    const handleVideoEnd = () => {
      if(video && audio) {
        video.currentTime = 0;
        audio.currentTime = 0;
        video.play();
        audio.play();
      }
    }

    // Loop both video and audio together
    video?.addEventListener('ended', handleVideoEnd);

    return () => {
      audio?.removeEventListener('loadedmetadata', handleAudioMetadata);
      video?.removeEventListener('ended', handleVideoEnd);
    };
  }, [videoUrl, audioUrl]);


  const playMedia = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    
    // Unmute the audio element. The video is always muted.
    audio.muted = false;

    // Start both at the same time
    const videoPromise = video.play();
    const audioPromise = audio.play();

    Promise.all([videoPromise, audioPromise]).then(() => {
        setIsPlaying(true);
        // If the user's intent is to be muted, re-apply the mute state now.
        if (isMuted) { 
            audio.muted = true;
        }
    }).catch(e => {
        console.error("Media play failed:", e);
        // Show a helpful message to the user
        alert("Your browser blocked media from playing automatically. Please click the play button.");
        setIsPlaying(false);
    });
  };

  const pauseMedia = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    video.pause();
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
    // If the user is unmuting for the first time, start playback.
    if (!newMutedState && !isPlaying) {
        playMedia();
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0">
      <div className="w-full h-full md:w-auto md:h-full aspect-[9/16] max-w-full max-h-screen relative overflow-hidden bg-black md:rounded-xl md:shadow-2xl md:shadow-primary/20">
        
        {videoUrl ? (
           <video
            ref={videoRef}
            playsInline
            loop // The video element loops. The 'ended' event handler syncs the audio loop.
            muted // The <video> is always muted; audio is controlled by the separate <audio> element.
            className="w-full h-full object-cover"
          />
        ) : null }
        
        {audioUrl && <audio ref={audioRef} muted={isMuted} />}

        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
           <div
            className="w-full text-center text-white font-semibold text-lg"
            style={{ textShadow: '0px 0px 8px rgba(0, 0, 0, 1)' }}
          >
            <KaraokeScript
              script={script}
              mediaRef={audioRef} // Karaoke is timed to the audio element
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
          <Button onClick={handleMuteToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
          <Button onClick={handlePlayPauseToggle} size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12">
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
