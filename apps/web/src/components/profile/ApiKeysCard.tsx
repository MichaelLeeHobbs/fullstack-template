// ===========================================
// API Keys Card
// ===========================================
// API key management with create, revoke, and raw key display dialogs.

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  Stack,
} from '@mui/material';
import { Add, Block, ContentCopy, Warning } from '@mui/icons-material';
import { useMyApiKeys, useCreateApiKey, useRevokeApiKey } from '../../hooks/useApiKeys.js';
import { useNotification } from '../../hooks/useNotification.js';
import type { ApiKey, CreateApiKeyInput } from '../../types/api-key.js';

export function ApiKeysCard() {
  const notify = useNotification();
  const { data: myKeys } = useMyApiKeys();
  const createKeyMutation = useCreateApiKey();
  const revokeKeyMutation = useRevokeApiKey();

  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rawKeyDialog, setRawKeyDialog] = useState<string | null>(null);
  const [revokeKeyTarget, setRevokeKeyTarget] = useState<ApiKey | null>(null);

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="API Keys"
          action={
            <Button size="small" startIcon={<Add />} onClick={() => setCreateKeyOpen(true)}>
              Create Key
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Prefix</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!myKeys || myKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No API keys</TableCell>
                  </TableRow>
                ) : (
                  myKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell><code>{key.prefix}...</code></TableCell>
                      <TableCell>
                        {!key.isActive ? (
                          <Chip label="Revoked" size="small" color="error" />
                        ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                          <Chip label="Expired" size="small" color="warning" />
                        ) : (
                          <Chip label="Active" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell align="right">
                        {key.isActive && (
                          <Tooltip title="Revoke">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setRevokeKeyTarget(key)}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createKeyOpen} onClose={() => setCreateKeyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="Key Name"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateKeyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!keyName || createKeyMutation.isPending}
            onClick={() => {
              const input: CreateApiKeyInput = { name: keyName, permissionIds: [] };
              createKeyMutation.mutate(input, {
                onSuccess: (data) => {
                  setCreateKeyOpen(false);
                  setKeyName('');
                  setRawKeyDialog(data.rawKey);
                  notify.success('API key created');
                },
                onError: (error: Error) => notify.error(error.message || 'Failed to create'),
              });
            }}
          >
            {createKeyMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raw Key Display */}
      <Dialog open={!!rawKeyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Warning color="warning" /> <span>API Key Created</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This key will not be shown again. Copy and store it securely.
          </Alert>
          <TextField
            value={rawKeyDialog ?? ''}
            fullWidth
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        if (rawKeyDialog) {
                          navigator.clipboard.writeText(rawKeyDialog);
                          notify.success('Copied to clipboard');
                        }
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRawKeyDialog(null)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <Dialog open={!!revokeKeyTarget} onClose={() => setRevokeKeyTarget(null)}>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          Revoke key &quot;{revokeKeyTarget?.name}&quot;? It will immediately stop working.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeKeyTarget(null)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={revokeKeyMutation.isPending}
            onClick={() => {
              if (revokeKeyTarget) {
                revokeKeyMutation.mutate(revokeKeyTarget.id, {
                  onSuccess: () => {
                    setRevokeKeyTarget(null);
                    notify.success('API key revoked');
                  },
                  onError: (error: Error) => notify.error(error.message || 'Failed to revoke'),
                });
              }
            }}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
