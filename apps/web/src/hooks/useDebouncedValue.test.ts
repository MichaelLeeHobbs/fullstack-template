// ===========================================
// Debounced Value Hook Tests
// ===========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue.js';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello'));
    expect(result.current).toBe('hello');
  });

  it('should not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe('hello');
  });

  it('should update value after delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('world');
  });

  it('should respect custom delay parameter', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe('hello');

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('world');
  });
});
