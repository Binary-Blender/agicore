import assert from 'assert';
import { clampInsertPosition, planReorder, deriveCompletionStats } from '../utils/playlistHelpers';

export const runPlaylistHelperTests = () => {
  assert.strictEqual(clampInsertPosition(undefined, 0), 1, 'empty playlist defaults to position 1');
  assert.strictEqual(clampInsertPosition(0, 4), 1, 'position clamps to minimum');
  assert.strictEqual(clampInsertPosition(3, 2), 3, 'position clamps to current count + 1');
  assert.strictEqual(clampInsertPosition(2, 5), 2, 'valid position preserved');

  assert.deepStrictEqual(planReorder(2, 2, 5), { direction: 'none', target: 2 }, 'no-op reorder');
  assert.deepStrictEqual(
    planReorder(5, 1, 5),
    { direction: 'up', target: 1, rangeStart: 1, rangeEnd: 4 },
    'moving upward increments surrounding positions'
  );
  assert.deepStrictEqual(
    planReorder(1, 4, 5),
    { direction: 'down', target: 4, rangeStart: 2, rangeEnd: 4 },
    'moving downward decrements surrounding positions'
  );

  assert.deepStrictEqual(
    deriveCompletionStats(null, 4, 'not_started'),
    { completedCount: 0, completionPercentage: 0 },
    'not started playlists have zero completion'
  );
  assert.deepStrictEqual(
    deriveCompletionStats(3, 5, 'in_progress'),
    { completedCount: 2, completionPercentage: 40 },
    'current position converts to completed count'
  );
  assert.deepStrictEqual(
    deriveCompletionStats(1, 0, 'completed'),
    { completedCount: 0, completionPercentage: 0 },
    'zero item playlists stay at zero percent'
  );
  assert.deepStrictEqual(
    deriveCompletionStats(5, 5, 'completed'),
    { completedCount: 5, completionPercentage: 100 },
    'completed playlists report 100%'
  );
};
