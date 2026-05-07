export const clampInsertPosition = (requested: number | null | undefined, currentCount: number): number => {
  const maxPosition = Math.max(currentCount + 1, 1);
  if (requested === null || requested === undefined || Number.isNaN(requested)) {
    return maxPosition;
  }

  const normalized = Math.floor(requested);
  if (normalized < 1) {
    return 1;
  }
  if (normalized > maxPosition) {
    return maxPosition;
  }
  return normalized;
};

export type ReorderPlan =
  | { direction: 'none'; target: number }
  | { direction: 'up' | 'down'; target: number; rangeStart: number; rangeEnd: number };

export const planReorder = (currentPosition: number, requested: number, totalItems: number): ReorderPlan => {
  if (totalItems <= 0) {
    return { direction: 'none', target: 1 };
  }

  const clampedTarget = Math.min(Math.max(1, Math.floor(requested)), totalItems);
  if (clampedTarget === currentPosition) {
    return { direction: 'none', target: currentPosition };
  }

  if (clampedTarget < currentPosition) {
    return {
      direction: 'up',
      target: clampedTarget,
      rangeStart: clampedTarget,
      rangeEnd: currentPosition - 1,
    };
  }

  return {
    direction: 'down',
    target: clampedTarget,
    rangeStart: currentPosition + 1,
    rangeEnd: clampedTarget,
  };
};

export const deriveCompletionStats = (
  currentPosition: number | null,
  totalItems: number,
  status: 'not_started' | 'in_progress' | 'completed'
) => {
  const normalizedTotal = Math.max(totalItems, 0);
  let completedCount = 0;

  if (status === 'completed') {
    completedCount = normalizedTotal;
  } else if (currentPosition && currentPosition > 0) {
    completedCount = Math.max(0, Math.min(currentPosition - 1, normalizedTotal));
  }

  const completionPercentage = normalizedTotal === 0 ? 0 : Math.round((completedCount / normalizedTotal) * 100);
  return { completedCount, completionPercentage };
};
