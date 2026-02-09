// ===========================================
// Admin Service Accounts Page
// ===========================================
// Service account management with list, create, and delete.

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
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useNotification } from '../../hooks/useNotification.js';
import { PageLoader } from '../../components/LoadingSpinner.js';
import {
  useServiceAccounts,
  useCreateServiceAccount,
  useDeleteServiceAccount,
} from '../../hooks/useApiKeys.js';
import type { ServiceAccount } from '../../types/api-key.js';

export function ServiceAccountsPage() {
  const notify = useNotification();

  // Data
  const { data: accounts, isLoading } = useServiceAccounts();
  const createMutation = useCreateServiceAccount();
  const deleteMutation = useDeleteServiceAccount();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceAccount | null>(null);
  const [email, setEmail] = useState('');

  const handleCreate = () => {
    createMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setEmail('');
          notify.success('Service account created');
        },
        onError: (error: Error) => notify.error(error.message || 'Failed to create'),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notify.success('Service account deleted');
      },
      onError: (error: Error) => notify.error(error.message || 'Failed to delete'),
    });
  };

  if (isLoading) return <PageLoader />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Service Accounts</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Create Service Account
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>API Keys</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!accounts || accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No service accounts found</TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={account.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={account.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      component={Link}
                      to={`/admin/api-keys?userId=${account.id}`}
                      size="small"
                      variant="text"
                    >
                      {account.apiKeyCount} key{account.apiKeyCount !== 1 ? 's' : ''}
                    </Button>
                  </TableCell>
                  <TableCell>{new Date(account.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(account)} color="error">
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
        <DialogTitle>Create Service Account</DialogTitle>
        <DialogContent>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
            helperText="Use an identifiable email like service-name@your-domain.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!email || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Service Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete service account &quot;{deleteTarget?.email}&quot;?
            This will also delete all associated API keys.
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
