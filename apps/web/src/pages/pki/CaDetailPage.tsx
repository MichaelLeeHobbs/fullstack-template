// ===========================================
// CA Detail Page
// ===========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Alert,
} from '@mui/material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useCa, useUpdateCa, useSuspendCa, useRetireCa } from '../../hooks/useCa.js';
import { useCertificateList } from '../../hooks/useCertificates.js';
import { useCrlLatest, useGenerateCrl } from '../../hooks/useCrl.js';
import type { UpdateCaInput } from '@fullstack-template/shared';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': case 'expired': case 'retired': return 'error';
    default: return 'default';
  }
};

export function CaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotification();

  const { data: ca, isLoading, error } = useCa(id!);
  const { data: certs } = useCertificateList({ caId: id, limit: 10 });
  const { data: latestCrl } = useCrlLatest(id!);

  const updateMutation = useUpdateCa();
  const suspendMutation = useSuspendCa();
  const retireMutation = useRetireCa();
  const generateCrlMutation = useGenerateCrl();

  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<UpdateCaInput>({});
  const [crlDialog, setCrlDialog] = useState(false);
  const [crlPassphrase, setCrlPassphrase] = useState('');

  if (isLoading) return <PageLoader message="Loading CA details..." />;
  if (error || !ca) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate authority</Typography></Container>;

  const handleUpdate = () => {
    updateMutation.mutate({ id: id!, data: editData }, {
      onSuccess: () => { notify.success('CA updated'); setEditDialog(false); },
      onError: (err: Error) => notify.error(err.message || 'Failed to update CA'),
    });
  };

  const handleSuspend = () => {
    if (!confirm('Are you sure you want to suspend this CA?')) return;
    suspendMutation.mutate(id!, {
      onSuccess: () => notify.success('CA suspended'),
      onError: (err: Error) => notify.error(err.message || 'Failed to suspend CA'),
    });
  };

  const handleRetire = () => {
    if (!confirm('Are you sure you want to retire this CA? This action cannot be undone.')) return;
    retireMutation.mutate(id!, {
      onSuccess: () => notify.success('CA retired'),
      onError: (err: Error) => notify.error(err.message || 'Failed to retire CA'),
    });
  };

  const handleGenerateCrl = () => {
    generateCrlMutation.mutate({ caId: id!, caPassphrase: crlPassphrase }, {
      onSuccess: () => { notify.success('CRL generated'); setCrlDialog(false); setCrlPassphrase(''); },
      onError: (err: Error) => notify.error(err.message || 'Failed to generate CRL'),
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">{ca.name}</Typography>
          <Typography color="text.secondary">{ca.commonName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {ca.status === 'active' && (
            <>
              <Button variant="outlined" onClick={() => { setEditData({ name: ca.name, description: ca.description ?? '' }); setEditDialog(true); }}>Edit</Button>
              <Button variant="outlined" color="warning" onClick={handleSuspend}>Suspend</Button>
              <Button variant="outlined" onClick={() => setCrlDialog(true)}>Generate CRL</Button>
            </>
          )}
          {ca.status === 'active' && <Button variant="outlined" color="error" onClick={handleRetire}>Retire</Button>}
        </Box>
      </Box>

      {/* CA Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Chip label={ca.status} color={statusColor(ca.status)} size="small" sx={{ mt: 0.5 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Type</Typography>
            <Typography>{ca.isRoot ? 'Root CA' : 'Intermediate CA'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Organization</Typography>
            <Typography>{ca.organization || '-'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Country</Typography>
            <Typography>{ca.country || '-'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Certificates Issued</Typography>
            <Typography>{ca.serialCounter}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Created</Typography>
            <Typography>{new Date(ca.createdAt).toLocaleString()}</Typography>
          </Grid>
          {ca.crlDistributionUrl && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">CRL Distribution URL</Typography>
              <Typography>{ca.crlDistributionUrl}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Latest CRL */}
      {latestCrl && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Latest CRL</Typography>
          <Typography><strong>CRL #:</strong> {latestCrl.crlNumber}</Typography>
          <Typography><strong>Entries:</strong> {latestCrl.entriesCount}</Typography>
          <Typography><strong>This Update:</strong> {new Date(latestCrl.thisUpdate).toLocaleString()}</Typography>
          <Typography><strong>Next Update:</strong> {new Date(latestCrl.nextUpdate).toLocaleString()}</Typography>
        </Paper>
      )}

      {/* Issued Certificates */}
      <Typography variant="h6" sx={{ mb: 2 }}>Issued Certificates</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Common Name</TableCell>
              <TableCell>Serial</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Expires</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certs?.data?.map(cert => (
              <TableRow key={cert.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pki/certificates/${cert.id}`)}>
                <TableCell>{cert.commonName}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{cert.serialNumber}</TableCell>
                <TableCell>{cert.certType}</TableCell>
                <TableCell><Chip label={cert.status} size="small" color={statusColor(cert.status)} /></TableCell>
                <TableCell>{new Date(cert.notAfter).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!certs?.data || certs.data.length === 0) && (
              <TableRow><TableCell colSpan={5} align="center">No certificates issued</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Certificate Authority</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Name" fullWidth value={editData.name ?? ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
          <TextField margin="dense" label="Description" fullWidth multiline rows={2} value={editData.description ?? ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
          <TextField margin="dense" label="Max Validity Days" type="number" fullWidth value={editData.maxValidityDays ?? ''} onChange={(e) => setEditData({ ...editData, maxValidityDays: Number(e.target.value) })} />
          <TextField margin="dense" label="Default Validity Days" type="number" fullWidth value={editData.defaultValidityDays ?? ''} onChange={(e) => setEditData({ ...editData, defaultValidityDays: Number(e.target.value) })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate CRL Dialog */}
      <Dialog open={crlDialog} onClose={() => setCrlDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate CRL</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>This will generate a new Certificate Revocation List for this CA.</Alert>
          <TextField autoFocus margin="dense" label="CA Passphrase" type="password" fullWidth value={crlPassphrase} onChange={(e) => setCrlPassphrase(e.target.value)} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrlDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerateCrl} disabled={!crlPassphrase || generateCrlMutation.isPending}>
            {generateCrlMutation.isPending ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
