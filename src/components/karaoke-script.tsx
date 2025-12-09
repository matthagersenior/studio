"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  videoRef: RefObject<HTMLVideoElement>;
}

export function KaraokeScript({ script, videoRef }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const scriptWords = useMemo(() => script.split(/\s+/), [script]);
  const wordCount = scriptWords.length;
  // Estimate reading time and derive word duration.
  const estimatedReadingTimeSeconds = wordCount / 3; // Approx. 3 words per second
  const wordDuration = estimatedReadingTimeSeconds / wordCount;


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);

  const timestampedWords = useMemo(() => {
    return script.split(/(\s+)/); // Split by space, keeping spaces
  }, [script]);

  let wordCounter = -1;

  return (
    <ScrollArea className="h-full md:h-auto">
      <div className="p-2 md:p-0 whitespace-pre-wrap">
        {timestampedWords.map((word, index) => {
          const isWhitespace = /^\s+$/.test(word);
          if (!isWhitespace) {
            wordCounter++;
          }

          const wordStartTime = wordCounter * wordDuration;
          const isSpoken = currentTime >= wordStartTime + wordDuration;
          const isSpeaking = currentTime >= wordStartTime && currentTime < wordStartTime + wordDuration;


          return (
            <span
              key={index}
              className={`transition-colors duration-200 ${
                isSpeaking ? 'text-yellow-300' : isSpoken ? 'text-white/90' : 'text-white/50'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </ScrollArea>
  );
}
