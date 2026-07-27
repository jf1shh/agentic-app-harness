import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set } from 'idb-keyval';
import { Logger } from '../src/services/logger';

// idb-keyval stubbed for the same reason as db.test.ts: what is under test is
// the app's log-retention contract, not IndexedDB.
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; every case was proved
// by mutation — see the PR body.
//
// The load-bearing behaviour here is the 500-entry cap. A crash logger without
// a working cap grows without bound in the same IndexedDB the wardrobe images
// use, so a single error loop can exhaust the store — and it fails silently,
// because every write is wrapped in a try/catch by design.

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const LOG_KEY = 'app_error_logs';
const MAX_LOGS = 500;

interface StoredLog {
  timestamp: string;
  message: string;
  details: Record<string, unknown>;
  userAgent: string;
}

const lastWrittenLogs = (): StoredLog[] => mockSet.mock.calls.at(-1)![1] as StoredLog[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mockSet.mockResolvedValue(undefined);
});

describe('Logger.error', () => {
  it('Given an empty log store, When an error is recorded, Then it is appended under the log key with its message and details', async () => {
    mockGet.mockResolvedValue(undefined);

    await Logger.error('Boom', { source: 'test.ts' });

    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockSet.mock.calls[0];
    expect(key).toBe(LOG_KEY);
    const logs = value as StoredLog[];
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Boom');
    expect(logs[0].details).toEqual({ source: 'test.ts' });
    expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('Given existing entries, When another error is recorded, Then it is appended rather than replacing them', async () => {
    mockGet.mockResolvedValue([{ timestamp: 't', message: 'first', details: {}, userAgent: 'x' }]);

    await Logger.error('second');

    const logs = lastWrittenLogs();
    expect(logs.map((l) => l.message)).toEqual(['first', 'second']);
  });

  it('Given no details argument, When an error is recorded, Then details default to an empty object', async () => {
    mockGet.mockResolvedValue(undefined);
    await Logger.error('No details');
    expect(lastWrittenLogs()[0].details).toEqual({});
  });

  it('Given a store holding something that is not an array, When an error is recorded, Then the log is rebuilt rather than crashing', async () => {
    // Corrupt or half-migrated storage must not permanently break logging —
    // which is exactly when you need the logger most.
    mockGet.mockResolvedValue('not-an-array');

    await Logger.error('After corruption');

    const logs = lastWrittenLogs();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('After corruption');
  });

  it('Given the log is already at the cap, When another error is recorded, Then it stays at the cap', async () => {
    const full = Array.from({ length: MAX_LOGS }, (_, i) => ({
      timestamp: 't', message: `old-${i}`, details: {}, userAgent: 'x',
    }));
    mockGet.mockResolvedValue(full);

    await Logger.error('newest');

    expect(lastWrittenLogs()).toHaveLength(MAX_LOGS);
  });

  it('Given an over-full log, When another error is recorded, Then the OLDEST entries are dropped and the newest is kept', async () => {
    // Trimming the wrong end would keep 500 entries and silently discard every
    // recent crash — the log would look healthy and be useless.
    const over = Array.from({ length: MAX_LOGS + 10 }, (_, i) => ({
      timestamp: 't', message: `old-${i}`, details: {}, userAgent: 'x',
    }));
    mockGet.mockResolvedValue(over);

    await Logger.error('newest');

    const logs = lastWrittenLogs();
    expect(logs).toHaveLength(MAX_LOGS);
    expect(logs.at(-1)!.message).toBe('newest');
    expect(logs[0].message).toBe('old-11');
    expect(logs.some((l) => l.message === 'old-0')).toBe(false);
  });

  it('Given a log just under the cap, When another error is recorded, Then nothing is trimmed', async () => {
    const nearly = Array.from({ length: MAX_LOGS - 1 }, (_, i) => ({
      timestamp: 't', message: `old-${i}`, details: {}, userAgent: 'x',
    }));
    mockGet.mockResolvedValue(nearly);

    await Logger.error('newest');

    const logs = lastWrittenLogs();
    expect(logs).toHaveLength(MAX_LOGS);
    expect(logs[0].message).toBe('old-0');
  });

  it('Given a store that rejects the write, When an error is recorded, Then the logger fails quietly rather than throwing', async () => {
    // A logger that throws while reporting a crash turns one bug into two.
    mockGet.mockResolvedValue([]);
    mockSet.mockRejectedValue(new Error('QuotaExceededError'));
    await expect(Logger.error('Boom')).resolves.toBeUndefined();
  });

  it('Given a store that rejects the read, When an error is recorded, Then the logger fails quietly rather than throwing', async () => {
    mockGet.mockRejectedValue(new Error('InvalidStateError'));
    await expect(Logger.error('Boom')).resolves.toBeUndefined();
  });
});

describe('Logger.init', () => {
  it('Given a browser window, When the logger is initialised, Then an uncaught error is captured into the log', async () => {
    mockGet.mockResolvedValue([]);
    Logger.init();

    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Uncaught TypeError: x is not a function',
      filename: 'app.js',
      lineno: 42,
      colno: 7,
    }));
    // The handler is fire-and-forget, so let its promise settle.
    await vi.waitFor(() => expect(mockSet).toHaveBeenCalled());

    const logs = lastWrittenLogs();
    expect(logs.at(-1)!.message).toContain('Uncaught Error');
    expect(logs.at(-1)!.details).toMatchObject({ source: 'app.js', line: 42, column: 7 });
  });
});
