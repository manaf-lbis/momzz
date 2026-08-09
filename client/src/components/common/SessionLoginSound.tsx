import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { playLoginSound } from '../../utils/loginSound';

let playedForCurrentAppLoad = false;

export const SessionLoginSound = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      playedForCurrentAppLoad = false;
      return;
    }
    if (playedForCurrentAppLoad) return;

    // iOS Safari requires a user gesture before audio can play.
    // We queue the sound on the FIRST touch or click after login,
    // then immediately remove the listener.
    const handleFirstGesture = () => {
      if (!playedForCurrentAppLoad) {
        playedForCurrentAppLoad = true;
        playLoginSound();
      }
      document.removeEventListener('touchstart', handleFirstGesture);
      document.removeEventListener('click', handleFirstGesture);
    };

    // Try to play immediately (works on desktop browsers and Android)
    // but also register gesture listener as fallback for iOS
    try {
      const audio = new Audio('/sounds/login-success.mpeg');
      audio.volume = 0.45;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            playedForCurrentAppLoad = true;
            document.removeEventListener('touchstart', handleFirstGesture);
            document.removeEventListener('click', handleFirstGesture);
          })
          .catch(() => {
            // Autoplay blocked — wait for first user gesture (iOS)
            document.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
            document.addEventListener('click', handleFirstGesture, { once: true });
          });
      }
    } catch {
      document.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
      document.addEventListener('click', handleFirstGesture, { once: true });
    }

    return () => {
      document.removeEventListener('touchstart', handleFirstGesture);
      document.removeEventListener('click', handleFirstGesture);
    };
  }, [isAuthenticated]);

  return null;
};
