export const completionFeedbackDurationMs = 1120;

export const shouldStartTaskCompletion = (
  currentCount: number,
  nextCount: number,
  maxCount: number,
) => currentCount < maxCount && nextCount >= maxCount;
