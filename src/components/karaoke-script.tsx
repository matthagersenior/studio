"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';
import type { TimedWord } from '@/app/actions';

interface KaraokeScriptProps {
  timestamps: TimedWord[];
  videoRef: RefObject<HTMLMediaElement>;
}

export function KaraokeScript({ timestamps, videoRef }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);

  if (!timestamps || timestamps.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-full md:h-auto">
      <div className="p-2 md:p-0 whitespace-pre-wrap">
        {timestamps.map((word, index) => {
          const isSpoken = currentTime >= word.endTime;
          const isSpeaking = currentTime >= word.startTime && currentTime < word.endTime;
          
          return (
            <span
              key={index}
              className={`transition-colors duration-200 ${
                isSpeaking ? 'text-yellow-300' : isSpoken ? 'text-white/90' : 'text-white/50'
              }`}
            >
              {word.word}{' '}
            </span>
          );
        })}
      </div>
    </ScrollArea>
  );
}
