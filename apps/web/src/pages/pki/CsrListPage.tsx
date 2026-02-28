// ===========================================
// CSR List Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TablePagination, TextField, MenuItem,
} from '@mui/material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useCsrList } from '../../hooks/useCsr.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

export function CsrListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useCsrList({
    page: page + 1,
    limit: rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
  });

  if (isLoading) return <PageLoader message="Loading certificate requests..." />;
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate requests</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Certificate Requests</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Common Name</TableCell>
              <TableCell>Key Algorithm</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map(csr => (
              <TableRow key={csr.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/requests/${csr.id}`)}>
                <TableCell>{csr.commonName}</TableCell>
                <TableCell>{csr.keyAlgorithm ?? '-'} {csr.keySize ? `${csr.keySize}` : ''}</TableCell>
                <TableCell><Chip label={csr.status} size="small" color={statusColor(csr.status)} /></TableCell>
                <TableCell>{new Date(csr.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <TableRow><TableCell colSpan={4} align="center">No certificate requests found</TableCell></TableRow>
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
