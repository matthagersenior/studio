
'use client';

import {useState, useRef, useEffect} from 'react';
import {Button} from './ui/button';
import Image from 'next/image';
import {KaraokeScript} from './karaoke-script';
import {PauseCircle, PlayCircle, Volume2, VolumeX} from 'lucide-react';

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // Autoplay when the component mounts
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        // Autoplay was prevented. The user must interact with the document first.
        // We will leave the play button visible for them to start.
        console.warn("Autoplay was prevented:", error);
      });

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleLoadedMetadata = () => setDuration(audio.duration);

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !audio.muted;
      setIsMuted(audio.muted);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full h-full max-w-md aspect-[9/16] relative overflow-hidden bg-black rounded-xl shadow-2xl shadow-primary/20">
        <audio ref={audioRef} src={audioUrl} />

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
          <KaraokeScript
            script={script}
            mediaRef={audioRef}
            mediaDuration={duration}
          />
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Button
            onClick={onReset}
            className="text-xs underline text-white/80 hover:text-white"
            variant="link"
          >
            ROTTEN ENOUGH
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayPause}
              className="text-white/80 hover:text-white"
            >
              {isPlaying ? (
                <PauseCircle size={24} />
              ) : (
                <PlayCircle size={24} />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="text-white/80 hover:text-white"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
