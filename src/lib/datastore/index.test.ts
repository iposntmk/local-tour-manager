import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const SupabaseStoreMock = vi.fn();
const IndexedDbStoreMock = vi.fn();

vi.mock('./supabase-store', () => ({
  SupabaseStore: SupabaseStoreMock,
}));

vi.mock('./indexeddb-store', () => ({
  IndexedDbStore: IndexedDbStoreMock,
}));

let infoSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  SupabaseStoreMock.mockReset();
  IndexedDbStoreMock.mockReset();
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe('createStore', () => {
  it('prefers Supabase when configuration is valid', async () => {
    SupabaseStoreMock.mockImplementation(() => ({ backend: 'supabase' }));
    IndexedDbStoreMock.mockImplementation(() => ({ backend: 'indexeddb' }));

    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { createStore, store } = await import('./index');

    expect(createStore()).toBe(store);
    expect(SupabaseStoreMock).toHaveBeenCalledTimes(1);
    expect(IndexedDbStoreMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Supabase'));
  });

  it('falls back to IndexedDB when Supabase config is missing', async () => {
    SupabaseStoreMock.mockImplementation(() => ({ backend: 'supabase' }));
    IndexedDbStoreMock.mockImplementation(() => ({ backend: 'indexeddb' }));

    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { createStore, store } = await import('./index');

    expect(createStore()).toBe(store);
    expect(SupabaseStoreMock).not.toHaveBeenCalled();
    expect(IndexedDbStoreMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('configuration missing'));
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('IndexedDB'));
  });

  it('falls back to IndexedDB when Supabase initialization fails', async () => {
    SupabaseStoreMock.mockImplementation(() => {
      throw new Error('boom');
    });
    IndexedDbStoreMock.mockImplementation(() => ({ backend: 'indexeddb' }));

    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { createStore, store } = await import('./index');

    expect(createStore()).toBe(store);
    expect(SupabaseStoreMock).toHaveBeenCalledTimes(1);
    expect(IndexedDbStoreMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize Supabase store'),
      expect.any(Error),
    );
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('IndexedDB'));
  });
});
