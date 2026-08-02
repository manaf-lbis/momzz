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
    if (!playedForCurrentAppLoad) {
      playedForCurrentAppLoad = true;
      playLoginSound();
    }
  }, [isAuthenticated]);

  return null;
};
