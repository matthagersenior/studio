
'use client';

import {useState, useRef, useEffect} from 'react';
import {Button} from './ui/button';
import {Play, Pause} from 'lucide-react';
import Image from 'next/image';
import {KaraokeScript} from './karaoke-script';
import {Progress} from './ui/progress';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Auto-play when the component mounts
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch((error) => {
          // Autoplay was prevented.
          console.log('Autoplay prevented:', error);
          setIsPlaying(false);
        });
    }

    const handleLoadedMetadata = () => setMediaDuration(audio.duration);
    const handleTimeUpdate = () =>
      setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]); // Depend on audioUrl to re-trigger if it changes

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full h-full max-w-md aspect-[9/16] relative overflow-hidden bg-black rounded-xl shadow-2xl shadow-primary/20">
        <audio ref={audioRef} src={audioUrl} loop />

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
            mediaDuration={mediaDuration}
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

          <Button
            onClick={togglePlayPause}
            variant="ghost"
            size="icon"
            className="text-white bg-black/30 rounded-full hover:bg-black/50 hover:text-white"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </Button>
        </div>

        <Progress
          value={progress}
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 [&>div]:bg-white"
        />
      </div>
    </div>
  );
}
