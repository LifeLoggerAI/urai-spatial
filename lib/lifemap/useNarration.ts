import { useEffect } from 'react';

export function useNarration() {
  useEffect(() => {
    const audio = new Audio('/ambient.mp3');
    audio.loop = true;
    audio.play();

    const timeout = setTimeout(() => {
      speak("This is your Life-Map.");
    }, 3500);

    return () => {
      audio.pause();
      clearTimeout(timeout);
    };
  }, []);
}

export function speak(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
