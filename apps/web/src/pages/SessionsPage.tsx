// ===========================================
// Sessions Page
// ===========================================
// Displays active sessions and allows revoking them.

import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Skeleton,
  Box,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '../hooks/useSessions.js';
import { useNotification } from '../hooks/useNotification.js';

export function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();
  const notify = useNotification();

  const handleRevoke = (id: string) => {
    revokeSession.mutate(id, {
      onSuccess: () => notify.success('Session revoked'),
      onError: (error: Error) => notify.error(error.message || 'Failed to revoke session'),
    });
  };

  const handleRevokeAll = () => {
    revokeAllSessions.mutate(undefined, {
      onSuccess: () => notify.success('All other sessions revoked'),
      onError: (error: Error) => notify.error(error.message || 'Failed to revoke sessions'),
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
      </Container>
    );
  }

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Active Sessions
      </Typography>

      <Card>
        <CardHeader
          title="Sessions"
          action={
            otherSessions.length > 0 && (
              <Button
                size="small"
                color="warning"
                onClick={handleRevokeAll}
                disabled={revokeAllSessions.isPending}
              >
                {revokeAllSessions.isPending ? 'Revoking...' : 'Revoke All Others'}
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Device / Browser</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!sessions || sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No active sessions</TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ maxWidth: 250 }} noWrap>
                            {session.userAgent || 'Unknown'}
                          </Typography>
                          {session.isCurrent && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{session.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        {session.lastUsedAt
                          ? new Date(session.lastUsedAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(session.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {!session.isCurrent && (
                          <Tooltip title="Revoke session">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleRevoke(session.id)}
                              disabled={revokeSession.isPending}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
}

export default SessionsPage;
