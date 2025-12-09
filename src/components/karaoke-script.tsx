"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  mediaRef: RefObject<HTMLAudioElement>;
  mediaDuration: number;
}

export function KaraokeScript({ script, mediaRef, mediaDuration }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => script.split(/\s+/), [script]);
  const timestamps = useMemo(() => {
    if (!mediaDuration || words.length === 0) return [];
    
    const durationPerWord = mediaDuration / words.length;
    return words.map((_, index) => {
      const startTime = index * durationPerWord;
      const endTime = startTime + durationPerWord;
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
    return <div className="p-2 md:p-0 whitespace-pre-wrap">{script}</div>;
  }
  
  return (
    <ScrollArea className="h-full md:h-auto">
      <div className="p-2 md:p-0 whitespace-pre-wrap">
        {words.map((word, index) => {
          const ts = timestamps[index];
          const isSpeaking = ts && currentTime >= ts.startTime && currentTime < ts.endTime;
          
          return (
            <span
              key={index}
              className={`transition-colors duration-200 ${
                isSpeaking ? 'text-yellow-300 scale-105 inline-block' : 'text-white/80'
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
