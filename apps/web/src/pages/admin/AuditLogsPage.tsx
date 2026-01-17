// ===========================================
// Admin Audit Logs Page
// ===========================================
// View security audit logs.

import { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AuditLog } from '../../api/admin.api.js';
import { PageLoader } from '../../components/LoadingSpinner.js';

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-logs', page, rowsPerPage],
    queryFn: () => adminApi.listAuditLogs(page + 1, rowsPerPage),
  });

  if (isLoading) return <PageLoader message="Loading audit logs..." />;

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">Failed to load audit logs</Typography>
      </Container>
    );
  }

  const logs = data?.data || [];
  const total = data?.pagination.total || 0;

  const getActionColor = (action: string, success: boolean): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    if (!success) return 'error';
    if (action.includes('DELETE') || action.includes('DEACTIVAT')) return 'warning';
    if (action.includes('LOGIN') || action.includes('REGISTER')) return 'success';
    if (action.includes('ADMIN')) return 'info';
    return 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Audit Logs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Security events and admin actions.
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Target/Details</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log: AuditLog) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.action}
                    size="small"
                    color={getActionColor(log.action, log.success)}
                    variant={log.success ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {log.actorEmail || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 250,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={log.details || undefined}
                  >
                    {log.details || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{log.ipAddress || '-'}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </TableContainer>
    </Container>
  );
}

export default AuditLogsPage;
