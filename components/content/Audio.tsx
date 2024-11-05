'use client';
import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Pause, Play, Volume2 } from 'lucide-react';
import { Slider } from '../ui/slider';

export default function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    if (audioRef.current) {
      audioRef.current.volume = volumeValue;
    }
  };

  return (
    <div className="flex justify-center items-center space-x-2">
      <audio ref={audioRef} src={url} />
      <Button size="icon" variant="ghost" onClick={togglePlay}>
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <Volume2 className="h-4 w-4" />
      <Slider
        className="w-24"
        value={[volume]}
        max={1}
        step={0.1}
        onValueChange={handleVolumeChange}
      />
    </div>
  );
}
