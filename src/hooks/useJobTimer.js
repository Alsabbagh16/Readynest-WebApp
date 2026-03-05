import { useState, useEffect, useRef, useCallback } from 'react';

export const useJobTimer = (initialSeconds = 0) => {
  const [time, setTime] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
  }, [isRunning]);

  const pauseTimer = useCallback(() => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsPaused(true);
    }
  }, [isRunning]);

  const resumeTimer = useCallback(() => {
    if (!isRunning) {
      startTimer();
    }
  }, [isRunning, startTimer]);

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setTime(0);
  }, []);

  const setElapsedTime = useCallback((seconds) => {
    setTime(seconds);
  }, []);

  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Format to HH:MM:SS
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return {
    time,
    isRunning,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
    setElapsedTime
  };
};