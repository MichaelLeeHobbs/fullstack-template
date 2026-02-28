// ===========================================
// Notification Store Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notification.store.js';

describe('Notification Store', () => {
  beforeEach(() => {
    useNotificationStore.setState({ unreadCount: 0 });
  });

  describe('initial state', () => {
    it('should have unreadCount of 0', () => {
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('setUnreadCount', () => {
    it('should set unread count to the given value', () => {
      useNotificationStore.getState().setUnreadCount(5);
      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });
  });

  describe('incrementUnread', () => {
    it('should increment unread count by 1', () => {
      useNotificationStore.getState().incrementUnread();
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('should increment from existing count', () => {
      useNotificationStore.getState().setUnreadCount(3);
      useNotificationStore.getState().incrementUnread();
      expect(useNotificationStore.getState().unreadCount).toBe(4);
    });
  });

  describe('reset', () => {
    it('should reset unread count to 0', () => {
      useNotificationStore.getState().setUnreadCount(10);
      useNotificationStore.getState().reset();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });
});
