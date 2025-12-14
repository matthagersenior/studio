'use client';

import {useState, useRef, useEffect} from 'react';
import {Button} from './ui/button';
import Image from 'next/image';
import {ScrollArea} from './ui/scroll-area';

interface StoryResultProps {
  script: string;
  imageUrl: string;
  audioUrl: string;
  onReset: () => void;
}

export function StoryResult({
  script,
  imageUrl,
  audioUrl,
  onReset,
}: StoryResultProps) {
  // Audio functionality is disabled, so we remove the related state and effects.
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full h-full max-w-md aspect-[9/16] relative overflow-hidden bg-black rounded-xl shadow-2xl shadow-primary/20">
        {/* The audio element is removed. */}

        <Image
          src={imageUrl}
          alt="Generated visual"
          fill
          className="object-cover animate-kenburns"
          priority
          unoptimized={imageUrl.endsWith('.gif')}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

        <div className="absolute inset-x-0 bottom-0 h-2/5 p-8 flex flex-col justify-end">
          <ScrollArea className="max-h-48 md:max-h-full">
            <p className="whitespace-pre-wrap text-white/90">{script}</p>
          </ScrollArea>
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Button
            onClick={onReset}
            className="text-xs underline text-white/80 hover:text-white"
            variant="link"
          >
            ROTTEN ENOUGH
          </Button>

          {/* Audio controls are removed. */}
        </div>
      </div>
    </div>
  );
}
