import { isCompletionSoundEnabled } from './completionSound';

const LOGIN_SOUND_URL = '/sounds/login-success.mpeg';

export const playLoginSound = () => {
  if (!isCompletionSoundEnabled()) return;
  const audio = new Audio(LOGIN_SOUND_URL);
  audio.volume = 0.45;
  audio.play().catch(() => {
    // Autoplay policies can block a restored session until the user interacts.
  });
};
