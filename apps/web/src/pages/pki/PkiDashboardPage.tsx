// ===========================================
// PKI Dashboard Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Card, CardContent,
} from '@mui/material';
import { Add, Security, VerifiedUser, Description, Warning } from '@mui/icons-material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useCaHierarchy } from '../../hooks/useCa.js';
import { useCertificateList } from '../../hooks/useCertificates.js';
import { useCsrList } from '../../hooks/useCsr.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': case 'expired': case 'retired': return 'error';
    default: return 'default';
  }
};

export function PkiDashboardPage() {
  const navigate = useNavigate();
  const { data: cas, isLoading: casLoading } = useCaHierarchy();
  const { data: certs, isLoading: certsLoading } = useCertificateList({ limit: 5 });
  const { data: pendingCsrs, isLoading: csrsLoading } = useCsrList({ status: 'pending', limit: 5 });

  if (casLoading || certsLoading || csrsLoading) return <PageLoader message="Loading PKI dashboard..." />;

  const activeCas = cas?.filter(ca => ca.status === 'active').length ?? 0;
  const totalCerts = certs?.pagination?.total ?? 0;
  const pendingCount = pendingCsrs?.pagination?.total ?? 0;

  // Find expiring certs (within 30 days)
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const expiringCerts = certs?.data?.filter(c => {
    const expiry = new Date(c.notAfter).getTime();
    return c.status === 'active' && expiry - now < thirtyDays && expiry > now;
  }) ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">PKI Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Add />} onClick={() => navigate('/pki/ca/create')}>
            New CA
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/pki/certificates/issue')}>
            Issue Certificate
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{activeCas}</Typography>
              <Typography color="text.secondary">Active CAs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VerifiedUser color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{totalCerts}</Typography>
              <Typography color="text.secondary">Certificates</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Description color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{pendingCount}</Typography>
              <Typography color="text.secondary">Pending CSRs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{expiringCerts.length}</Typography>
              <Typography color="text.secondary">Expiring Soon</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CA Hierarchy */}
      <Typography variant="h6" sx={{ mb: 2 }}>Certificate Authorities</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Common Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cas?.map(ca => (
              <TableRow key={ca.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/ca/${ca.id}`)}>
                <TableCell>{ca.name}</TableCell>
                <TableCell>{ca.commonName}</TableCell>
                <TableCell>{ca.isRoot ? 'Root' : 'Intermediate'}</TableCell>
                <TableCell><Chip label={ca.status} size="small" color={statusColor(ca.status)} /></TableCell>
              </TableRow>
            ))}
            {(!cas || cas.length === 0) && (
              <TableRow><TableCell colSpan={4} align="center">No certificate authorities found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Expiring Certificates */}
      {expiringCerts.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Certificates Expiring Soon</Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Common Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Expires</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiringCerts.map(cert => (
                  <TableRow key={cert.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/certificates/${cert.id}`)}>
                    <TableCell>{cert.commonName}</TableCell>
                    <TableCell>{cert.certType}</TableCell>
                    <TableCell>{new Date(cert.notAfter).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Pending CSRs */}
      {(pendingCsrs?.data?.length ?? 0) > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Pending Certificate Requests</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Common Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingCsrs?.data?.map(csr => (
                  <TableRow key={csr.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/requests/${csr.id}`)}>
                    <TableCell>{csr.commonName}</TableCell>
                    <TableCell><Chip label={csr.status} size="small" color="warning" /></TableCell>
                    <TableCell>{new Date(csr.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
  );
}
