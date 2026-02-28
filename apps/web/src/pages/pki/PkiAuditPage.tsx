// ===========================================
// PKI Audit Log Page
// ===========================================

import { useState } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TablePagination, TextField, MenuItem,
} from '@mui/material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { usePkiAuditList } from '../../hooks/usePkiAudit.js';

export function PkiAuditPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, error } = usePkiAuditList({
    page: page + 1,
    limit: rowsPerPage,
    ...(actionFilter && { action: actionFilter }),
  });

  if (isLoading) return <PageLoader message="Loading PKI audit logs..." />;
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load audit logs</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>PKI Audit Log</Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Action" value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Actions</MenuItem>
          <MenuItem value="ca.create">CA Created</MenuItem>
          <MenuItem value="ca.update">CA Updated</MenuItem>
          <MenuItem value="ca.suspend">CA Suspended</MenuItem>
          <MenuItem value="ca.retire">CA Retired</MenuItem>
          <MenuItem value="cert.issue">Certificate Issued</MenuItem>
          <MenuItem value="cert.revoke">Certificate Revoked</MenuItem>
          <MenuItem value="cert.renew">Certificate Renewed</MenuItem>
          <MenuItem value="csr.submit">CSR Submitted</MenuItem>
          <MenuItem value="csr.approve">CSR Approved</MenuItem>
          <MenuItem value="csr.reject">CSR Rejected</MenuItem>
          <MenuItem value="crl.generate">CRL Generated</MenuItem>
          <MenuItem value="profile.create">Profile Created</MenuItem>
          <MenuItem value="profile.update">Profile Updated</MenuItem>
          <MenuItem value="profile.delete">Profile Deleted</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Actor IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map(log => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell><Chip label={log.action} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  {log.targetType && (
                    <Typography variant="body2">{log.targetType}{log.targetId ? `: ${log.targetId.substring(0, 8)}...` : ''}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={log.success ? 'Success' : 'Failed'} size="small" color={log.success ? 'success' : 'error'} />
                  {log.errorMessage && <Typography variant="caption" color="error" sx={{ ml: 1 }}>{log.errorMessage}</Typography>}
                </TableCell>
                <TableCell>{log.actorIp ?? '-'}</TableCell>
              </TableRow>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <TableRow><TableCell colSpan={5} align="center">No audit logs found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {data?.pagination && (
          <TablePagination
            component="div"
            count={data.pagination.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        )}
      </TableContainer>
    </Container>
  );
}
