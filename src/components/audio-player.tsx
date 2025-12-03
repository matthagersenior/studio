"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Volume2, VolumeX, Rewind } from "lucide-react";
import { Slider } from "./ui/slider";

interface AudioPlayerProps {
  src: string;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", onEnded);

    // If src changes, reset and play if it was playing
    if (isPlaying) {
      audio.play().catch(e => console.error("Audio play failed", e));
    }

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Audio play failed", e));
    }
    setIsPlaying(!isPlaying);
  };
  
  const rewind = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (!isPlaying) {
          togglePlayPause();
        }
    }
  };

  const onSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };
  
  return (
    <div 
      className="bg-primary/20 md:bg-transparent text-primary-foreground md:text-white p-3 rounded-lg w-full flex flex-col gap-2"
      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
    >
      <audio ref={audioRef} src={src} muted={isMuted} preload="auto" />
      <div className="flex items-center gap-2 md:gap-4">
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
        </Button>
        <Button onClick={rewind} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
            <Rewind className="h-5 w-5 fill-current" />
        </Button>
        <div className="flex-grow flex items-center gap-2">
            <span className="text-sm font-mono w-12 text-center select-none">{formatTime(currentTime)}</span>
            <Slider
                value={[currentTime]}
                max={duration || 1}
                step={0.1}
                onValueChange={onSliderChange}
                className="[&>div]:bg-white/20 [&>div>div]:bg-white [&>span]:border-white [&>span]:bg-black/50 [&>span]:ring-offset-black/50"
            />
            <span className="text-sm font-mono w-12 text-center select-none">{formatTime(duration)}</span>
        </div>
        <Button onClick={() => setIsMuted(!isMuted)} variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
