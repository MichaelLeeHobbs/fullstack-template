// ===========================================
// Admin API Keys Page
// ===========================================
// API key management with list, create, revoke, and delete.

import { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  Stack,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Delete,
  Block,
  ExpandMore,
  ContentCopy,
  Warning,
} from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification.js';
import { PageLoader } from '../../components/LoadingSpinner.js';
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
} from '../../hooks/useApiKeys.js';
import { usePermissionsGrouped } from '../../hooks/useRoles.js';
import type { ApiKeyListItem, CreateApiKeyInput, Permission } from '@fullstack-template/shared';

export function ApiKeysPage() {
  const notify = useNotification();

  // Data
  const { data: apiKeysData, isLoading } = useApiKeys();
  const { data: permissionsGrouped } = usePermissionsGrouped();
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();
  const deleteMutation = useDeleteApiKey();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyListItem | null>(null);
  const [rawKeyDialog, setRawKeyDialog] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({ name: '', expiresAt: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const apiKeys = apiKeysData?.data ?? [];

  const handleCreate = () => {
    const input: CreateApiKeyInput = {
      name: formData.name,
      permissionIds: Array.from(selectedPermissions),
      expiresAt: formData.expiresAt || undefined,
    };

    createMutation.mutate(input, {
      onSuccess: (data) => {
        setCreateOpen(false);
        setFormData({ name: '', expiresAt: '' });
        setSelectedPermissions(new Set());
        setRawKeyDialog(data.rawKey);
        notify.success('API key created');
      },
      onError: (error: Error) => notify.error(error.message || 'Failed to create API key'),
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    revokeMutation.mutate(revokeTarget.id, {
      onSuccess: () => {
        setRevokeTarget(null);
        notify.success('API key revoked');
      },
      onError: (error: Error) => notify.error(error.message || 'Failed to revoke'),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notify.success('API key deleted');
      },
      onError: (error: Error) => notify.error(error.message || 'Failed to delete'),
    });
  };

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusChip = (key: ApiKeyListItem) => {
    if (!key.isActive) return <Chip label="Revoked" size="small" color="error" />;
    if (key.expiresAt && new Date(key.expiresAt) < new Date())
      return <Chip label="Expired" size="small" color="warning" />;
    return <Chip label="Active" size="small" color="success" />;
  };

  if (isLoading) return <PageLoader />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">API Keys</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Create Key
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No API keys found</TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>
                    <code>{key.prefix}...</code>
                  </TableCell>
                  <TableCell>{key.ownerEmail}</TableCell>
                  <TableCell>{getStatusChip(key)}</TableCell>
                  <TableCell>{key.permissionCount} permissions</TableCell>
                  <TableCell>
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      {key.isActive && (
                        <Tooltip title="Revoke">
                          <IconButton size="small" onClick={() => setRevokeTarget(key)} color="warning">
                            <Block fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(key)} color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Expires At"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Optional. Leave empty for no expiration."
            />
            {permissionsGrouped && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Permissions</Typography>
                {Object.entries(permissionsGrouped).map(([resource, perms]) => (
                  <Accordion key={resource} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {resource.replace('_', ' ')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        {(perms as Permission[]).map((perm) => (
                          <FormControlLabel
                            key={perm.id}
                            control={
                              <Checkbox
                                checked={selectedPermissions.has(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                size="small"
                              />
                            }
                            label={`${perm.name} — ${perm.description}`}
                          />
                        ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.name || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raw Key Display Dialog */}
      <Dialog open={!!rawKeyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" /> API Key Created
          </Box>
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
          <Button onClick={() => setRawKeyDialog(null)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Confirmation */}
      <Dialog open={!!revokeTarget} onClose={() => setRevokeTarget(null)}>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Revoke key &quot;{revokeTarget?.name}&quot; ({revokeTarget?.prefix}...)? It will immediately stop working.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button onClick={handleRevoke} color="warning" variant="contained" disabled={revokeMutation.isPending}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete key &quot;{deleteTarget?.name}&quot;? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteMutation.isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
