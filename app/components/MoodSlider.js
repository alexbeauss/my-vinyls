"use client";
import { useState, useRef, useEffect, useCallback } from 'react';

export default function MoodSlider({ initialMood, onMoodChange }) {
  const [mood, setMood] = useState(initialMood);
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMoodChange = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newMood = parseFloat((percentage * 10).toFixed(2));
    setMood(newMood);
    onMoodChange(newMood);
  }, [onMoodChange]);

  const handleStart = useCallback((e) => {
    isDraggingRef.current = true;
    handleMoodChange(e.type.includes('mouse') ? e.clientX : e.touches[0].clientX);
  }, [handleMoodChange]);

  const handleMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    handleMoodChange(e.type.includes('mouse') ? e.clientX : e.touches[0].clientX);
  }, [handleMoodChange]);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const handleGlobalMove = (e) => {
      handleMove(e);
    };

    const handleGlobalEnd = () => {
      handleEnd();
    };

    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalMove);
    document.addEventListener('touchend', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [handleMove, handleEnd]);

  const getMoodText = useCallback(() => {
    if (mood < 2) return "Très désagréable";
    if (mood < 4) return "Désagréable";
    if (mood < 6) return "Neutre";
    if (mood < 8) return "Agréable";
    return "Très agréable";
  }, [mood]);

  return (
    <div className="mb-4 w-full max-w-md mx-auto px-4">
      <p className="text-center text-xl font-semibold mb-4">Comment vous sentez-vous aujourd&apos;hui ?</p>
      <div className="relative pt-6 pb-6">
        <div className="flex justify-between text-sm text-gray-500 absolute w-full" style={{top: 0}}>
          <span>Très désagréable</span>
          <span>Très agréable</span>
        </div>
        <div 
          ref={sliderRef}
          className="w-full bg-gray-300 rounded-full cursor-pointer"
          style={{ height: '12px' }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        ></div>
        <div
          className="absolute top-1/2 w-8 h-8 bg-blue-500 border-2 border-blue-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 cursor-pointer shadow-md"
          style={{ left: `${mood * 10}%`, top: '50%' }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        ></div>
      </div>
      <p className="text-center text-xl font-semibold mt-4">{getMoodText()}</p>
    </div>
  );
}
