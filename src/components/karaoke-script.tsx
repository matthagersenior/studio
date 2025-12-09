"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  audioDuration: number;
  audioRef: RefObject<HTMLMediaElement>;
}

export function KaraokeScript({ script, audioDuration, audioRef }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => script.split(/\s+/), [script]);
  const timestamps = useMemo(() => {
    const totalWords = words.length;
    if (totalWords === 0 || audioDuration === 0) return [];

    const durationPerWord = audioDuration / totalWords;
    return words.map((word, index) => {
      const startTime = index * durationPerWord;
      const endTime = startTime + durationPerWord;
      return { word, startTime, endTime };
    });
  }, [words, audioDuration]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef]);

  if (!timestamps || timestamps.length === 0) {
    return <div className="p-2 md:p-0 whitespace-pre-wrap">{script}</div>;
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
