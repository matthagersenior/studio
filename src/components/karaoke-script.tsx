"use client";

import { useState, useEffect, useMemo, RefObject } from 'react';
import { WordTimestamp } from '@/app/actions';
import { ScrollArea } from './ui/scroll-area';

interface KaraokeScriptProps {
  script: string;
  timestamps: WordTimestamp[];
  audioRef: RefObject<HTMLAudioElement>;
}

// A simple utility to clean words for matching purposes
const cleanWord = (word: string) => {
  return word.toLowerCase().replace(/[.,!?;:]/g, '');
};

export function KaraokeScript({ script, timestamps, audioRef }: KaraokeScriptProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef]);

  // Memoize the processed words from the script to avoid recalculating on every render
  const scriptWords = useMemo(() => script.split(/\s+/), [script]);

  // Find the index of the currently spoken word
  const currentWordIndex = useMemo(() => {
    if (!timestamps || timestamps.length === 0) return -1;
    
    // Find the last timestamp whose start time is before the current audio time
    const currentTimestampIndex = timestamps.findIndex(
      (t, i) =>
        currentTime >= t.startSeconds &&
        (i === timestamps.length - 1 || currentTime < timestamps[i + 1].startSeconds)
    );

    if (currentTimestampIndex === -1) return -1;

    // This is a naive mapping. It assumes the words in the script and timestamps align perfectly.
    // A more robust solution might involve more complex matching logic.
    return currentTimestampIndex;

  }, [currentTime, timestamps]);

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
          const isSpoken = wordCounter < currentWordIndex;
          const isSpeaking = wordCounter === currentWordIndex;

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
