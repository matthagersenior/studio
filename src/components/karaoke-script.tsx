"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement>;
  mediaDuration: number;
}

// Estimate words per second for a more natural pace
const WORDS_PER_SECOND = 2.5;

export function KaraokeScript({ script, mediaRef, mediaDuration }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => script.split(/\s+/).filter(w => w.length > 0), [script]);
  
  const timestamps = useMemo(() => {
    if (!mediaDuration || words.length === 0) return [];
    
    // Calculate total character length to distribute time more effectively
    const totalChars = words.reduce((acc, word) => acc + word.length, 0);
    const averageTimePerChar = mediaDuration / totalChars;
    
    let accumulatedTime = 0;
    return words.map((word) => {
      const estimatedWordDuration = word.length * averageTimePerChar + 0.1; // Add small buffer
      const startTime = accumulatedTime;
      accumulatedTime += estimatedWordDuration;
      const endTime = accumulatedTime;
      return { startTime, endTime };
    });
  }, [words, mediaDuration]);


  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [mediaRef]);

  if (!timestamps || timestamps.length === 0) {
    return <div className="whitespace-pre-wrap">{script}</div>;
  }
  
  return (
    <ScrollArea className="max-h-48 md:max-h-full">
      <div className="whitespace-pre-wrap">
        {words.map((word, index) => {
          const ts = timestamps[index];
          const isSpeaking = ts && currentTime >= ts.startTime && currentTime < ts.endTime;
          
          return (
            <span
              key={index}
              className={`transition-all duration-150 ease-in-out ${
                isSpeaking ? 'text-yellow-300 scale-105 font-bold inline-block' : 'text-white/80'
              }`}
            >
              {word}{' '}
            </span>
          );
        })}
      </div>
    </ScrollArea>
  );
}
