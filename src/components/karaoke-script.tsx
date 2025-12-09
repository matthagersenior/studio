"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  videoDuration: number;
  videoRef: RefObject<HTMLVideoElement>;
}

export function KaraokeScript({ script, videoDuration, videoRef }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => script.split(/\s+/), [script]);
  const timestamps = useMemo(() => {
    const totalWords = words.length;
    if (totalWords === 0 || videoDuration === 0) return [];

    // Simulate timestamps by dividing the total duration by the number of words.
    const durationPerWord = videoDuration / totalWords;
    return words.map((word, index) => {
      const startTime = index * durationPerWord;
      const endTime = startTime + durationPerWord;
      return { word, startTime, endTime };
    });
  }, [words, videoDuration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // Loop the currentTime for the caption effect
      setCurrentTime(video.currentTime % videoDuration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, videoDuration]);

  if (!timestamps || timestamps.length === 0) {
    return <div className="p-2 md:p-0 whitespace-pre-wrap">{script}</div>;
  }

  return (
    <ScrollArea className="h-full md:h-auto">
      <div className="p-2 md:p-0 whitespace-pre-wrap">
        {timestamps.map((word, index) => {
          const isSpeaking = currentTime >= word.startTime && currentTime < word.endTime;
          
          return (
            <span
              key={index}
              className={`transition-colors duration-200 ${
                isSpeaking ? 'text-yellow-300 scale-105 inline-block' : 'text-white/80'
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
