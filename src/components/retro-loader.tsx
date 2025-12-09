"use client";

import { useEffect, useState } from 'react';

const loadingTexts = [
  "Reticulating Splines...",
  "Harvesting Memes...",
  "Engaging Brainrot...",
  "Downloading Chaos...",
  "Synthesizing Absurdity...",
  "Compiling Irony...",
  "Defragmenting Consciousness...",
  "Initializing Skibidi...",
];

export function RetroLoader() {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Simulate a non-linear, chunky loading process
        const increment = Math.random() * 5 + 1;
        return Math.min(prev + increment, 100);
      });
    }, 400);

    const textInterval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % loadingTexts.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto font-mono text-[#00FF41]">
      <div className="bg-[#1a1a1a] border-4 border-t-[#2e2e2e] border-l-[#2e2e2e] border-b-black border-r-black p-1">
        <div className="bg-black border-2 border-[#101010] p-4">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span>C:\> BRAINROT.EXE</span>
            <span>_</span>
          </div>
          <p className="text-sm mb-3 h-4">{loadingTexts[textIndex]}</p>
          
          <div className="w-full h-6 bg-[#1a1a1a] border-2 border-[#2e2e2e] flex items-center p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[#008F11] to-[#00FF41] transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center text-lg font-bold mt-2">{Math.floor(progress)}%</div>
        </div>
      </div>
       <div className="bg-[#2e2e2e] h-4 mt-1 flex items-center justify-center">
            <div className="w-16 h-1 bg-[#1a1a1a]"></div>
        </div>
    </div>
  );
}
