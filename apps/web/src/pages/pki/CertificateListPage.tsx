// ===========================================
// Certificate List Page
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
import { useCertificateList } from '../../hooks/useCertificates.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': case 'expired': return 'error';
    default: return 'default';
  }
};

export function CertificateListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useCertificateList({
    page: page + 1,
    limit: rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { certType: typeFilter }),
    ...(search && { search }),
  });

  if (isLoading) return <PageLoader message="Loading certificates..." />;
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificates</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Certificates</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/pki/certificates/issue')}>
          Issue Certificate
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="revoked">Revoked</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Type" value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="server">Server</MenuItem>
          <MenuItem value="client">Client</MenuItem>
          <MenuItem value="user">User</MenuItem>
          <MenuItem value="ca">CA</MenuItem>
          <MenuItem value="smime">S/MIME</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Common Name</TableCell>
              <TableCell>Serial Number</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Not Before</TableCell>
              <TableCell>Not After</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map(cert => (
              <TableRow key={cert.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/certificates/${cert.id}`)}>
                <TableCell>{cert.commonName}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{cert.serialNumber}</TableCell>
                <TableCell>{cert.certType}</TableCell>
                <TableCell><Chip label={cert.status} size="small" color={statusColor(cert.status)} /></TableCell>
                <TableCell>{new Date(cert.notBefore).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(cert.notAfter).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <TableRow><TableCell colSpan={6} align="center">No certificates found</TableCell></TableRow>
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
