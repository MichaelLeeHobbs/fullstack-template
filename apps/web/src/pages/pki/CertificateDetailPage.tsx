// ===========================================
// Certificate Detail Page
// ===========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, Chip, Grid, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert,
} from '@mui/material';
import { Download, Block, Autorenew } from '@mui/icons-material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useCertificate, useRevokeCertificate, useRenewCertificate } from '../../hooks/useCertificates.js';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': case 'expired': return 'error';
    default: return 'default';
  }
};

const REVOCATION_REASONS = [
  'unspecified', 'keyCompromise', 'caCompromise', 'affiliationChanged',
  'superseded', 'cessationOfOperation', 'certificateHold',
];

export function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotification();

  const { data: cert, isLoading, error } = useCertificate(id!);
  const revokeMutation = useRevokeCertificate();
  const renewMutation = useRenewCertificate();

  const [revokeDialog, setRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('unspecified');
  const [renewDialog, setRenewDialog] = useState(false);
  const [renewPassphrase, setRenewPassphrase] = useState('');
  const [renewDays, setRenewDays] = useState(365);
  const [downloadDialog, setDownloadDialog] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pem' | 'der' | 'pkcs12'>('pem');
  const [downloadPassword, setDownloadPassword] = useState('');

  if (isLoading) return <PageLoader message="Loading certificate..." />;
  if (error || !cert) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate</Typography></Container>;

  const handleRevoke = () => {
    revokeMutation.mutate({ id: id!, data: { reason: revokeReason } }, {
      onSuccess: () => { notify.success('Certificate revoked'); setRevokeDialog(false); },
      onError: (err: Error) => notify.error(err.message || 'Failed to revoke certificate'),
    });
  };

  const handleRenew = () => {
    renewMutation.mutate({ id: id!, data: { caPassphrase: renewPassphrase, validityDays: renewDays } }, {
      onSuccess: (result) => {
        notify.success('Certificate renewed');
        setRenewDialog(false);
        navigate(`/pki/certificates/${result.certificate.id}`);
      },
      onError: (err: Error) => notify.error(err.message || 'Failed to renew certificate'),
    });
  };

  const handleDownload = () => {
    const searchParams = new URLSearchParams();
    searchParams.set('format', downloadFormat);
    if (downloadFormat === 'pkcs12' && downloadPassword) searchParams.set('password', downloadPassword);
    // Open download in new tab
    window.open(`/api/v1/certificates/${id}/download?${searchParams.toString()}`, '_blank');
    setDownloadDialog(false);
  };

  const daysUntilExpiry = Math.ceil((new Date(cert.notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">{cert.commonName}</Typography>
          <Typography color="text.secondary">Serial: {cert.serialNumber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download />} onClick={() => setDownloadDialog(true)}>
            Download
          </Button>
          {cert.status === 'active' && (
            <>
              <Button variant="outlined" startIcon={<Autorenew />} onClick={() => setRenewDialog(true)}>
                Renew
              </Button>
              <Button variant="outlined" color="error" startIcon={<Block />} onClick={() => setRevokeDialog(true)}>
                Revoke
              </Button>
            </>
          )}
        </Box>
      </Box>

      {cert.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This certificate expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.
        </Alert>
      )}
      {cert.status === 'active' && daysUntilExpiry <= 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>This certificate has expired.</Alert>
      )}

      {/* Certificate Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Certificate Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Chip label={cert.status} color={statusColor(cert.status)} size="small" sx={{ mt: 0.5 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Type</Typography>
            <Typography>{cert.certType}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Not Before</Typography>
            <Typography>{new Date(cert.notBefore).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Not After</Typography>
            <Typography>{new Date(cert.notAfter).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Organization</Typography>
            <Typography>{cert.organization || '-'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Country</Typography>
            <Typography>{cert.country || '-'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Fingerprint</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{cert.fingerprint}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* SANs */}
      {cert.sans && cert.sans.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Subject Alternative Names</Typography>
          {cert.sans.map((san, i) => (
            <Chip key={i} label={`${san.type}: ${san.value}`} sx={{ mr: 1, mb: 1 }} variant="outlined" />
          ))}
        </Paper>
      )}

      {/* PEM */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Certificate PEM</Typography>
        <TextField
          fullWidth
          multiline
          rows={8}
          value={cert.certificatePem}
          slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8em' } } }}
        />
      </Paper>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialog} onClose={() => setRevokeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke Certificate</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>This action cannot be undone. The certificate will be permanently revoked.</Alert>
          <TextField
            select fullWidth margin="dense" label="Revocation Reason"
            value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)}
          >
            {REVOCATION_REASONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRevoke} disabled={revokeMutation.isPending}>
            {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewDialog} onClose={() => setRenewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Renew Certificate</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="CA Passphrase" type="password" fullWidth value={renewPassphrase} onChange={(e) => setRenewPassphrase(e.target.value)} required />
          <TextField margin="dense" label="New Validity (days)" type="number" fullWidth value={renewDays} onChange={(e) => setRenewDays(Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenew} disabled={!renewPassphrase || renewMutation.isPending}>
            {renewMutation.isPending ? 'Renewing...' : 'Renew'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Download Dialog */}
      <Dialog open={downloadDialog} onClose={() => setDownloadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Download Certificate</DialogTitle>
        <DialogContent>
          <TextField select fullWidth margin="dense" label="Format" value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value as 'pem' | 'der' | 'pkcs12')}>
            <MenuItem value="pem">PEM</MenuItem>
            <MenuItem value="der">DER</MenuItem>
            <MenuItem value="pkcs12">PKCS#12</MenuItem>
          </TextField>
          {downloadFormat === 'pkcs12' && (
            <TextField margin="dense" label="Password (required for PKCS#12)" type="password" fullWidth value={downloadPassword} onChange={(e) => setDownloadPassword(e.target.value)} required />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDownload} disabled={downloadFormat === 'pkcs12' && !downloadPassword}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
