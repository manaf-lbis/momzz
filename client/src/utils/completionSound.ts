const SOUND_ENABLED_KEY = 'completion-sound-enabled';
const COMPLETION_SOUND_URL = '/sounds/checklist-complete.mpeg';
const REOPEN_SOUND_URL = '/sounds/task-reopened.mpeg';

export const isCompletionSoundEnabled = () => localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';

export const setCompletionSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
};

const playSound = (url: string, volume: number) => {
  if (!isCompletionSoundEnabled()) return;

  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {
    // Browsers may block sound until the user has interacted with the page.
  });
};

export const playCompletionSound = () => playSound(COMPLETION_SOUND_URL, 0.45);

export const playReopenSound = () => playSound(REOPEN_SOUND_URL, 0.45);
