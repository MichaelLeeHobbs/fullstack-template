// ===========================================
// Notification Bell
// ===========================================
// IconButton with badge showing unread count.

import { useState } from 'react';
import { IconButton, Badge, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNotificationStore } from '../../stores/notification.store.js';
import { useUnreadCount } from '../../hooks/useNotifications.js';
import { NotificationMenu } from './NotificationMenu.js';

export function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Fetch initial count + fallback polling
  useUnreadCount();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationMenu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} />
    </>
  );
}
