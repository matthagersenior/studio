'use client';
import { useEffect, useRef, useState } from 'react';
import type { StoryResultPayload } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { KaraokeScript } from '@/components/karaoke-script';
import { Maximize, Minimize, Repeat } from 'lucide-react';

interface StoryResultProps extends Omit<StoryResultPayload, 'error'> {
  onNewStory: () => void;
}

export function StoryResult({
  script,
  imageUrl,
  audioUrl,
  onNewStory,
}: StoryResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const timeUpdateHandler = () => {
      setCurrentTime(audio.currentTime);
    };

    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);
    const endedHandler = () => {
      // Loop the audio
      audio.currentTime = 0;
      audio.play();
    };

    audio.addEventListener('timeupdate', timeUpdateHandler);
    audio.addEventListener('play', playHandler);
    audio.addEventListener('pause', pauseHandler);
    audio.addEventListener('ended', endedHandler);

    // Attempt to autoplay
    audio.play().catch((error) => {
      console.warn('Autoplay was prevented:', error);
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('timeupdate', timeUpdateHandler);
      audio.removeEventListener('play', playHandler);
      audio.removeEventListener('pause', pauseHandler);
      audio.removeEventListener('ended', endedHandler);
    };
  }, []);

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    return () =>
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div className="absolute inset-0 w-full h-full" onClick={togglePlay}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Generated visual"
          className="w-full h-full object-cover animate-kenburns"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 z-10 text-center">
        <KaraokeScript script={script} currentTime={currentTime} />
      </div>

      <audio ref={audioRef} src={audioUrl} className="hidden" />

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewStory}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <Repeat className="h-5 w-5" />
          <span className="sr-only">New Story</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
          <span className="sr-only">
            {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          </span>
        </Button>
      </div>

      {!isPlaying && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 cursor-pointer"
          onClick={togglePlay}
        >
          <svg
            className="w-24 h-24 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}
