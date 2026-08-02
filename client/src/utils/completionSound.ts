const SOUND_ENABLED_KEY = 'completion-sound-enabled';
const COMPLETION_SOUND_URL = '/sounds/checklist-complete.mpeg';

export const isCompletionSoundEnabled = () => localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';

export const setCompletionSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
};

export const playCompletionSound = () => {
  if (!isCompletionSoundEnabled()) return;

  const audio = new Audio(COMPLETION_SOUND_URL);
  audio.volume = 0.45;
  audio.play().catch(() => {
    // Browsers may block sound until the user has interacted with the page.
  });
};
