"use client";
import React, { useMemo } from "react";

// A simple utility to parse the script into lines with timestamps
// This is a placeholder and would need a more robust implementation
// for real-world use with actual timestamped data from the TTS service.
const parseScript = (script: string) => {
  const words = script.split(/\s+/);
  const wordCount = words.length;
  // Estimate duration based on an average reading speed (e.g., 150 words per minute)
  const estimatedDuration = (wordCount / 150) * 60;
  
  const wordTimestamps = words.map((word, index) => {
    const startTime = (index / wordCount) * estimatedDuration;
    const endTime = ((index + 1) / wordCount) * estimatedDuration;
    return { word, startTime, endTime };
  });

  return wordTimestamps;
};


interface KaraokeScriptProps {
  script: string;
  currentTime: number;
}

export function KaraokeScript({ script, currentTime }: KaraokeScriptProps) {
  const words = useMemo(() => parseScript(script), [script]);

  return (
    <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
      {words.map(({ word, startTime, endTime }, index) => {
        const isActive = currentTime >= startTime && currentTime < endTime;
        return (
          <span
            key={index}
            className={`transition-colors duration-100 ease-in-out ${
              isActive ? "text-yellow-300" : "text-white/80"
            }`}
          >
            {word}{" "}
          </span>
        );
      })}
    </p>
  );
}
