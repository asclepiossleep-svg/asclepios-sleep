// Lane C (sleep-session start concurrency fix) — serializes concurrent
// async work for the same key within this process by chaining promises.
// Covers the single-process sqlite dev/test path, where a Postgres advisory
// lock isn't available; combine with a DB-level lock for correctness across
// multiple server instances (see routes/sleepSession.ts).
const queues = new Map<string, Promise<unknown>>();

export function withUserLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const tail = queues.get(key) ?? Promise.resolve();
  const result = tail.then(fn, fn);
  const settled = result.then(
    () => {},
    () => {}
  );
  queues.set(key, settled);
  settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return result;
}
