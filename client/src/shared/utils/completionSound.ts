// Audio feedback permanently disabled per user request

export const isCompletionSoundEnabled = (): boolean => false;

export const setCompletionSoundEnabled = (_enabled: boolean) => {};

export const useSoundSetting = () => {
  return {
    isSoundEnabled: false,
    toggleSound: () => {},
    setSoundEnabled: () => {},
  };
};

export const playCompletionSound = () => {};

export const playReopenSound = () => {};

export const playWelcomeSound = () => {};

