import confetti from 'canvas-confetti';

/**
 * Trigger a subtle, snappy confetti burst for single sub-task completion.
 */
export const triggerSubTaskConfetti = () => {
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#facc15', '#f59e0b', '#10b981', '#ffffff'],
      disableForReducedMotion: true,
    });
  } catch (err) {
    console.error('[Confetti] Error triggering subtask confetti:', err);
  }
};

/**
 * Trigger a BIG celebration confetti explosion when all vehicle tasks are complete.
 */
export const triggerVehicleReadyConfetti = () => {
  try {
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#facc15', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#facc15', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  } catch (err) {
    console.error('[Confetti] Error triggering vehicle ready confetti:', err);
  }
};
