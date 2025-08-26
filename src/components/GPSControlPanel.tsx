// components/GPSControlPanel.tsx
"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  FastForward,
} from "lucide-react";
import { GPSData } from "../utils/dataLoader";

interface Props {
  gpsData: GPSData[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onIndexChange: (i: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (s: number) => void;
}

const GPSControlPanel: React.FC<Props> = ({
  gpsData,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onIndexChange,
  onPlayPause,
  onSpeedChange,
}) => {
  const total = gpsData.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPS Playback Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onIndexChange(currentIndex - 1)}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={onPlayPause}>
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={() => onIndexChange(currentIndex + 1)}
            disabled={currentIndex >= total - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => onSpeedChange(playbackSpeed * 2)}>
            <FastForward className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-600">
          Point {currentIndex + 1} / {total}, Speed {playbackSpeed}x
        </div>
      </CardContent>
    </Card>
  );
};

export default GPSControlPanel;
