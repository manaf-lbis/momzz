const SOUND_ENABLED_KEY = 'garage-app-sound-enabled';

const COMPLETION_SOUND_URL = '/sounds/checklist-complete.mpeg';
const REOPEN_SOUND_URL = '/sounds/task-reopened.mpeg';
const WELCOME_SOUND_URL = '/sounds/login-success.mpeg';

export const isCompletionSoundEnabled = (): boolean => {
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val !== 'false';
};

export const setCompletionSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  if (enabled) {
    // Play subtle test chime when turning sound on
    playToneChime([523.25, 659.25], 0.15);
  }
};

// Web Audio API Synthesizer Fallback
const playToneChime = (freqs: number[], duration = 0.2) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + duration);
    });
  } catch (e) {
    // Ignore audio context errors
  }
};

const playSound = (url: string, volume: number, fallbackFreqs: number[]) => {
  if (!isCompletionSoundEnabled()) return;

  const audio = new Audio(url);
  audio.volume = volume;
  audio
    .play()
    .catch(() => {
      // Browser blocked HTML5 Audio → play Web Audio API synthesizer chime
      playToneChime(fallbackFreqs, 0.25);
    });
};

export const playCompletionSound = () => {
  playSound(COMPLETION_SOUND_URL, 0.6, [587.33, 880]); // D5 -> A5 high chime
};

export const playReopenSound = () => {
  playSound(REOPEN_SOUND_URL, 0.5, [440, 349.23]); // A4 -> F4 low tone
};

export const playWelcomeSound = () => {
  playSound(WELCOME_SOUND_URL, 0.5, [392, 523.25, 659.25]); // G4 -> C5 -> E5 welcome chord
};
