// ===========================================
// Admin Users Page
// ===========================================
// User management with list, edit, and delete.

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
  TablePagination,
  TextField,
  Box,
  IconButton,
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  InputAdornment,
} from '@mui/material';
import { Search, Delete, CheckCircle, Cancel } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '../../api/admin.api.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { PageLoader } from '../../components/LoadingSpinner.js';

export function UsersPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<AdminUser | null>(null);

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page, rowsPerPage, search],
    queryFn: () =>
      adminApi.listUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
      }),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { isActive?: boolean; isAdmin?: boolean } }) =>
      adminApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      notify.success('User updated');
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      notify.success('User deleted');
      setDeleteDialog(null);
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Failed to delete user');
    },
  });

  const handleToggleActive = (user: AdminUser) => {
    updateMutation.mutate({
      userId: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const handleToggleAdmin = (user: AdminUser) => {
    updateMutation.mutate({
      userId: user.id,
      data: { isAdmin: !user.isAdmin },
    });
  };

  const handleDelete = () => {
    if (deleteDialog) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  if (isLoading) return <PageLoader message="Loading users..." />;

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">Failed to load users</Typography>
      </Container>
    );
  }

  const users = data?.data || [];
  const total = data?.pagination.total || 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Verified</TableCell>
              <TableCell align="center">Admin</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.email}</TableCell>
                <TableCell align="center">
                  <Tooltip title={user.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}>
                    <Switch
                      checked={user.isActive}
                      onChange={() => handleToggleActive(user)}
                      disabled={user.id === currentUser?.id}
                      color="success"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {user.emailVerified ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Cancel color="disabled" fontSize="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={user.isAdmin ? 'Admin - Click to revoke' : 'User - Click to grant admin'}>
                    <Switch
                      checked={user.isAdmin}
                      onChange={() => handleToggleAdmin(user)}
                      disabled={user.id === currentUser?.id}
                      color="primary"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete user">
                    <span>
                      <IconButton
                        color="error"
                        onClick={() => setDeleteDialog(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Delete />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog?.email}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UsersPage;
