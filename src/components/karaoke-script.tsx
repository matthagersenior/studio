
"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement>;
  mediaDuration: number;
}

export function KaraokeScript({ script, mediaRef, mediaDuration }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => {
    return script.split(/\s+/).filter(w => w.length > 0).map((word, index) => ({
      word,
      id: `${word}-${index}`
    }));
  }, [script]);
  
  const timestamps = useMemo(() => {
    if (!mediaDuration || words.length === 0) return [];
    
    // Total "units" = total characters + number of words (for spaces)
    const totalChars = words.reduce((acc, w) => acc + w.word.length, 0);
    const totalUnits = totalChars + words.length -1;
    if (totalUnits <= 0) return [];

    const timePerUnit = mediaDuration / totalUnits;
    
    let accumulatedTime = 0;
    return words.map(({ word }) => {
      const startTime = accumulatedTime;
      // duration is based on characters + 1 unit for the following space
      const wordDuration = (word.length + 1) * timePerUnit;
      accumulatedTime += wordDuration;
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
        {words.map(({ word, id }, index) => {
          const ts = timestamps[index];
          const isSpeaking = ts && currentTime >= ts.startTime && currentTime < ts.endTime;
          
          return (
            <span
              key={id}
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
