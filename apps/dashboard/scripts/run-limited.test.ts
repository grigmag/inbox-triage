import { describe, expect, it } from 'vitest';
import { runLimited } from './run-limited';

describe('runLimited', () => {
  it('returns results in task order with at most the limit in flight', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const started: number[] = [];

    const tasks = [30, 5, 20, 1, 10].map((delay, index) => async () => {
      started.push(index);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, delay));
      inFlight -= 1;
      return index;
    });

    await expect(runLimited(tasks, 2)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(maxInFlight).toBe(2);
    expect(started).toEqual([0, 1, 2, 3, 4]);
  });

  it('resolves an empty list', async () => {
    await expect(runLimited([], 3)).resolves.toEqual([]);
  });
});
