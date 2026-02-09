// ===========================================
// Notification Menu
// ===========================================
// Popover showing recent notifications.

import {
  Popover,
  Box,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DoneAll, Delete as DeleteIcon, Circle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../../hooks/useNotifications.js';
import type { Notification } from '../../api/notifications.api.js';

interface NotificationMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function NotificationMenu({ anchorEl, open, onClose }: NotificationMenuProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  const handleClick = (notification: Notification) => {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: { width: 380, maxHeight: 480 },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Tooltip title="Mark all as read">
            <IconButton size="small" onClick={handleMarkAllRead}>
              <DoneAll fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider />

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
          {notifications.map((n) => (
            <ListItemButton
              key={n.id}
              onClick={() => handleClick(n)}
              sx={{
                bgcolor: n.readAt ? 'transparent' : 'action.hover',
                '&:hover .delete-btn': { opacity: 1 },
              }}
            >
              {!n.readAt && (
                <Circle sx={{ fontSize: 8, color: 'primary.main', mr: 1.5, flexShrink: 0 }} />
              )}
              <ListItemText
                primary={n.title}
                secondary={
                  <>
                    {n.body && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 260,
                        }}
                      >
                        {n.body}
                      </Typography>
                    )}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {formatTimeAgo(n.createdAt)}
                    </Typography>
                  </>
                }
                sx={{ ml: n.readAt ? 2.5 : 0 }}
              />
              <IconButton
                className="delete-btn"
                size="small"
                onClick={(e) => handleDelete(e, n.id)}
                sx={{ opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Button size="small" onClick={onClose}>
              Close
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
}
