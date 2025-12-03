import Image from "next/image";
import { Card, CardContent } from "./ui/card";
import { AudioPlayer } from "./audio-player";
import { ScrollArea } from "./ui/scroll-area";

interface StoryResultProps {
  script: string;
  visualDataUri: string;
  voiceoverMedia: string;
}

export function StoryResult({ script, visualDataUri, voiceoverMedia }: StoryResultProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/30 shadow-xl">
      <CardContent className="p-4 md:p-6">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="relative aspect-square rounded-lg overflow-hidden border shadow-inner">
            <Image
              src={visualDataUri}
              alt="Generated cinematic visual"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="flex flex-col gap-4 max-h-[70vh] md:max-h-[25.75rem]">
            <AudioPlayer src={voiceoverMedia} />
            <ScrollArea className="flex-grow border rounded-lg p-4 bg-background/50">
              <p className="whitespace-pre-wrap text-sm text-foreground">{script}</p>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
