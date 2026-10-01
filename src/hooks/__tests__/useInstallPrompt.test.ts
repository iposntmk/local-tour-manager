import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { INSTALL_DISMISS_DAYS, INSTALL_DISMISS_KEY } from '@/lib/pwa-install';

const DAY_MS = 24 * 60 * 60 * 1000;

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is hidden until the browser offers an install', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.mode).toBeNull();
  });

  it('switches to native mode on beforeinstallprompt and suppresses the default mini-infobar', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = fireBeforeInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.mode).toBe('native');
  });

  it('shows the native prompt and hides after the user answers', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = fireBeforeInstallPrompt('accepted');

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.mode).toBeNull();
  });

  it('hides and remembers the dismissal', () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.mode).toBeNull();
    const until = Number(localStorage.getItem(INSTALL_DISMISS_KEY));
    expect(until).toBeGreaterThan(Date.now() + (INSTALL_DISMISS_DAYS - 1) * DAY_MS);
  });

  it('stays hidden while a dismissal is still active', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now() + DAY_MS));
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();

    expect(result.current.mode).toBeNull();
  });

  it('asks again once the dismissal has expired', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now() - DAY_MS));
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();

    expect(result.current.mode).toBe('native');
  });

  it('hides once the app is installed', () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.mode).toBeNull();
  });
});
