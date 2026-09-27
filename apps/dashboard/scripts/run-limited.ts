/** Runs tasks in order with at most `limit` in flight. */
export async function runLimited<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );

  return results;
}
