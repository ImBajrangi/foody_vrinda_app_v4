import { useState, useEffect, useRef } from 'react';

const ALARM_SFX_URL = "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3";

export function useAudioAlarm() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize audio object once
    const audio = new Audio(ALARM_SFX_URL);
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const enableAudio = async () => {
    if (audioUnlocked || !audioRef.current) return;
    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      console.log("🔊 Browser Audio Context Unlocked");
    } catch (err) {
      console.warn("Audio unlock failed (waiting for interaction):", err);
    }
  };

  const playAlarm = () => {
    if (!audioRef.current) return;
    if (isPlaying) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(error => {
        console.warn("Audio play blocked. Interaction needed.", error);
      });
  };

  const stopAlarm = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  return {
    audioUnlocked,
    isPlaying,
    enableAudio,
    playAlarm,
    stopAlarm
  };
}
