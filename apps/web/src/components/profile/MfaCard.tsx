// ===========================================
// MFA Card
// ===========================================
// Multi-factor authentication management with setup, disable, and backup code dialogs.

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { Security, ContentCopy } from '@mui/icons-material';
import { useMfaMethods, useSetupTotp, useVerifyTotpSetup, useDisableMfa, useRegenerateBackupCodes } from '../../hooks/useMfa.js';
import { useNotification } from '../../hooks/useNotification.js';

export function MfaCard() {
  const notify = useNotification();
  const { data: mfaMethods } = useMfaMethods();
  const setupTotpMutation = useSetupTotp();
  const verifyTotpSetupMutation = useVerifyTotpSetup();
  const disableMfaMutation = useDisableMfa();
  const regenerateBackupCodesMutation = useRegenerateBackupCodes();

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenCode, setRegenCode] = useState('');

  const isMfaEnabled = mfaMethods && mfaMethods.length > 0;

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Multi-Factor Authentication" avatar={<Security />} />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2">
              Status: {isMfaEnabled ? (
                <Chip label="Enabled" size="small" color="success" />
              ) : (
                <Chip label="Disabled" size="small" color="default" />
              )}
            </Typography>
          </Box>

          {!isMfaEnabled ? (
            <Button
              variant="outlined"
              onClick={() => {
                setSetupOpen(true);
                setSetupData(null);
                setSetupCode('');
                setBackupCodes(null);
                setupTotpMutation.mutate(undefined, {
                  onSuccess: (data) => setSetupData(data),
                  onError: (error: Error) => notify.error(error.message || 'Failed to start TOTP setup'),
                });
              }}
            >
              Set Up TOTP
            </Button>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => { setDisableOpen(true); setDisableCode(''); }}
              >
                Disable TOTP
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setRegenOpen(true); setRegenCode(''); setBackupCodes(null); }}
              >
                Regenerate Backup Codes
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* TOTP Setup Dialog */}
      <Dialog open={setupOpen} onClose={() => { if (!backupCodes) setSetupOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{backupCodes ? 'Save Your Backup Codes' : 'Set Up TOTP'}</DialogTitle>
        <DialogContent>
          {backupCodes ? (
            <BackupCodesDisplay codes={backupCodes} onCopy={() => notify.success('Copied to clipboard')} />
          ) : setupData ? (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img src={setupData.qrCodeDataUrl} alt="TOTP QR Code" width={200} height={200} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Manual entry: <code>{setupData.secret}</code>
              </Typography>
              <TextField
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                label="Verification Code"
                fullWidth
                autoFocus
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              />
            </>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {backupCodes ? (
            <Button variant="contained" onClick={() => { setSetupOpen(false); setBackupCodes(null); }}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => setSetupOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={setupCode.length !== 6 || verifyTotpSetupMutation.isPending}
                onClick={() => {
                  verifyTotpSetupMutation.mutate(setupCode, {
                    onSuccess: (data) => {
                      setBackupCodes(data.backupCodes);
                      setSetupCode('');
                      notify.success('TOTP enabled');
                    },
                    onError: (error: Error) => notify.error(error.message || 'Verification failed'),
                  });
                }}
              >
                {verifyTotpSetupMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Disable MFA Dialog */}
      <Dialog open={disableOpen} onClose={() => setDisableOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Disable TOTP</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your current TOTP code to confirm disabling two-factor authentication.
          </Typography>
          <TextField
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            label="TOTP Code"
            fullWidth
            autoFocus
            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={!disableCode || disableMfaMutation.isPending}
            onClick={() => {
              disableMfaMutation.mutate({ method: 'totp', code: disableCode }, {
                onSuccess: () => {
                  setDisableOpen(false);
                  notify.success('TOTP disabled');
                },
                onError: (error: Error) => notify.error(error.message || 'Failed to disable'),
              });
            }}
          >
            {disableMfaMutation.isPending ? 'Disabling...' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={regenOpen} onClose={() => { if (!backupCodes) setRegenOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{backupCodes ? 'New Backup Codes' : 'Regenerate Backup Codes'}</DialogTitle>
        <DialogContent>
          {backupCodes ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your old backup codes are now invalid. Save these new codes securely.
              </Alert>
              <BackupCodesDisplay codes={backupCodes} onCopy={() => notify.success('Copied to clipboard')} />
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Enter your current TOTP code to regenerate backup codes. Your old codes will be invalidated.
              </Typography>
              <TextField
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value)}
                label="TOTP Code"
                fullWidth
                autoFocus
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {backupCodes ? (
            <Button variant="contained" onClick={() => { setRegenOpen(false); setBackupCodes(null); }}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => setRegenOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={regenCode.length !== 6 || regenerateBackupCodesMutation.isPending}
                onClick={() => {
                  regenerateBackupCodesMutation.mutate({ method: 'totp', code: regenCode }, {
                    onSuccess: (data) => {
                      setBackupCodes(data.backupCodes);
                      setRegenCode('');
                      notify.success('Backup codes regenerated');
                    },
                    onError: (error: Error) => notify.error(error.message || 'Failed to regenerate'),
                  });
                }}
              >
                {regenerateBackupCodesMutation.isPending ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

function BackupCodesDisplay({ codes, onCopy }: { codes: string[]; onCopy: () => void }) {
  return (
    <>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Save these backup codes securely. They will not be shown again.
      </Alert>
      <Box sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
        {codes.map((code, i) => (
          <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace' }}>
            {code}
          </Typography>
        ))}
      </Box>
      <Button
        sx={{ mt: 1 }}
        size="small"
        startIcon={<ContentCopy />}
        onClick={() => {
          navigator.clipboard.writeText(codes.join('\n'));
          onCopy();
        }}
      >
        Copy All
      </Button>
    </>
  );
}
