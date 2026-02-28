// ===========================================
// Socket Store Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from './socket.store.js';

describe('Socket Store', () => {
  beforeEach(() => {
    useSocketStore.setState({ isConnected: false, connectionError: null });
  });

  describe('initial state', () => {
    it('should not be connected initially', () => {
      expect(useSocketStore.getState().isConnected).toBe(false);
    });

    it('should have no connection error initially', () => {
      expect(useSocketStore.getState().connectionError).toBeNull();
    });
  });

  describe('setConnected', () => {
    it('should set connected state and clear error', () => {
      useSocketStore.getState().setConnectionError('some error');
      useSocketStore.getState().setConnected(true);

      const state = useSocketStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.connectionError).toBeNull();
    });

    it('should set disconnected state', () => {
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setConnected(false);
      expect(useSocketStore.getState().isConnected).toBe(false);
    });
  });

  describe('setConnectionError', () => {
    it('should set error and disconnect', () => {
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setConnectionError('Connection lost');

      const state = useSocketStore.getState();
      expect(state.connectionError).toBe('Connection lost');
      expect(state.isConnected).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setConnectionError('error');
      useSocketStore.getState().reset();

      const state = useSocketStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBeNull();
    });
  });
});
