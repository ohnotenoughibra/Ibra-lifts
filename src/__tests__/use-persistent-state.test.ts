import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from '@/lib/use-persistent-state';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('usePersistentState', () => {
  it('survives unmount/remount (leave and come back)', () => {
    const a = renderHook(() => usePersistentState('k', 'x'));
    act(() => a.result.current[1]('typed'));
    a.unmount();
    const b = renderHook(() => usePersistentState('k', 'x'));
    expect(b.result.current[0]).toBe('typed');
  });
  it('expires after its TTL', () => {
    localStorage.setItem('k', JSON.stringify({ v: 'old', at: Date.now() - 2000 }));
    const { result } = renderHook(() => usePersistentState('k', 'fresh', { ttlMs: 1000 }));
    expect(result.current[0]).toBe('fresh');
  });
  it('clear() drops the stored value synchronously', () => {
    const { result } = renderHook(() => usePersistentState('k', ''));
    act(() => result.current[1]('draft'));
    act(() => result.current[2]());
    expect(localStorage.getItem('k')).toBeNull();
  });
  it('null key behaves like plain useState', () => {
    const { result } = renderHook(() => usePersistentState<string>(null, 'a'));
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
    expect(localStorage.length).toBe(0);
  });
  it('session storage option', () => {
    const { result } = renderHook(() => usePersistentState('tab', 'home', { storage: 'session' }));
    act(() => result.current[1]('train'));
    expect(JSON.parse(sessionStorage.getItem('tab')!).v).toBe('train');
  });
  it('survives corrupt storage', () => {
    localStorage.setItem('k', '{not json');
    const { result } = renderHook(() => usePersistentState('k', 'ok'));
    expect(result.current[0]).toBe('ok');
  });
});
