// ===========================================
// CA List Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, TablePagination,
  TextField, MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useCaList } from '../../hooks/useCa.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'retired': return 'error';
    default: return 'default';
  }
};

export function CaListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useCaList({
    page: page + 1,
    limit: rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
  });

  if (isLoading) return <PageLoader message="Loading certificate authorities..." />;
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate authorities</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Certificate Authorities</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/pki/ca/create')}>
          Create CA
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
          <MenuItem value="retired">Retired</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Common Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Certificates Issued</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map(ca => (
              <TableRow key={ca.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/ca/${ca.id}`)}>
                <TableCell>{ca.name}</TableCell>
                <TableCell>{ca.commonName}</TableCell>
                <TableCell>{ca.isRoot ? 'Root' : 'Intermediate'}</TableCell>
                <TableCell><Chip label={ca.status} size="small" color={statusColor(ca.status)} /></TableCell>
                <TableCell>{ca.serialCounter}</TableCell>
                <TableCell>{new Date(ca.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <TableRow><TableCell colSpan={6} align="center">No certificate authorities found</TableCell></TableRow>
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
