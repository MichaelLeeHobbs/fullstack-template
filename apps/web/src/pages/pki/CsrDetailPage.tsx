// ===========================================
// CSR Detail Page
// ===========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, Chip, Grid, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useCsr, useApproveCsr, useRejectCsr } from '../../hooks/useCsr.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

export function CsrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotification();

  const { data: csr, isLoading, error } = useCsr(id!);
  const approveMutation = useApproveCsr();
  const rejectMutation = useRejectCsr();

  const [approveDialog, setApproveDialog] = useState(false);
  const [approvePassphrase, setApprovePassphrase] = useState('');
  const [approveDays, setApproveDays] = useState(365);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) return <PageLoader message="Loading certificate request..." />;
  if (error || !csr) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate request</Typography></Container>;

  const handleApprove = () => {
    approveMutation.mutate({ id: id!, data: { caPassphrase: approvePassphrase, validityDays: approveDays } }, {
      onSuccess: () => { notify.success('CSR approved and certificate issued'); setApproveDialog(false); },
      onError: (err: Error) => notify.error(err.message || 'Failed to approve CSR'),
    });
  };

  const handleReject = () => {
    rejectMutation.mutate({ id: id!, data: { reason: rejectReason } }, {
      onSuccess: () => { notify.success('CSR rejected'); setRejectDialog(false); },
      onError: (err: Error) => notify.error(err.message || 'Failed to reject CSR'),
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">{csr.commonName}</Typography>
          <Typography color="text.secondary">Certificate Signing Request</Typography>
        </Box>
        {csr.status === 'pending' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => setApproveDialog(true)}>
              Approve
            </Button>
            <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setRejectDialog(true)}>
              Reject
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Request Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Chip label={csr.status} color={statusColor(csr.status)} size="small" sx={{ mt: 0.5 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Key Algorithm</Typography>
            <Typography>{csr.keyAlgorithm ?? '-'} {csr.keySize ? `${csr.keySize} bits` : ''}</Typography>
          </Grid>
          {csr.subjectDn && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Subject DN</Typography>
              <Typography sx={{ fontFamily: 'monospace' }}>{csr.subjectDn}</Typography>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Submitted</Typography>
            <Typography>{new Date(csr.createdAt).toLocaleString()}</Typography>
          </Grid>
          {csr.rejectionReason && (
            <Grid item xs={12}>
              <Alert severity="error">Rejected: {csr.rejectionReason}</Alert>
            </Grid>
          )}
          {csr.certificateId && (
            <Grid item xs={12}>
              <Button variant="text" onClick={() => navigate(`/pki/certificates/${csr.certificateId}`)}>
                View Issued Certificate
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* SANs */}
      {csr.sans && csr.sans.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Subject Alternative Names</Typography>
          {csr.sans.map((san, i) => (
            <Chip key={i} label={`${san.type}: ${san.value}`} sx={{ mr: 1, mb: 1 }} variant="outlined" />
          ))}
        </Paper>
      )}

      {/* CSR PEM */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>CSR PEM</Typography>
        <TextField
          fullWidth multiline rows={10} value={csr.csrPem}
          slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8em' } } }}
        />
      </Paper>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Certificate Request</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>This will sign the CSR and issue a certificate.</Alert>
          <TextField autoFocus margin="dense" label="CA Passphrase" type="password" fullWidth value={approvePassphrase} onChange={(e) => setApprovePassphrase(e.target.value)} required />
          <TextField margin="dense" label="Validity (days)" type="number" fullWidth value={approveDays} onChange={(e) => setApproveDays(Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={!approvePassphrase || approveMutation.isPending}>
            {approveMutation.isPending ? 'Approving...' : 'Approve & Issue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Certificate Request</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Rejection Reason" fullWidth multiline rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectReason || rejectMutation.isPending}>
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
