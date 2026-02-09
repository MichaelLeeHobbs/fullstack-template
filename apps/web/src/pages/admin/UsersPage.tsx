// ===========================================
// Admin Users Page
// ===========================================
// User management with list, edit, delete, and role assignment.

import { useState, useEffect, useDeferredValue } from 'react';
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
  Chip,
  Stack,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { Search, Delete, CheckCircle, Cancel, Security } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '../../api/admin.api.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useRoles, useUserRoles, useSetUserRoles } from '../../hooks/useRoles.js';
import { usePermission } from '../../hooks/usePermission.js';
import { PERMISSIONS } from '../../types/role.js';

export function UsersPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const canUpdateUsers = usePermission(PERMISSIONS.USERS_UPDATE);

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [deleteDialog, setDeleteDialog] = useState<AdminUser | null>(null);
  const [rolesDialog, setRolesDialog] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Fetch users (deferredSearch avoids a query per keystroke)
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page, rowsPerPage, deferredSearch],
    queryFn: () =>
      adminApi.listUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: deferredSearch || undefined,
      }),
  });

  // Fetch all roles for the dialog
  const { data: roles } = useRoles();

  // Fetch user roles when dialog opens
  const { data: userRoles } = useUserRoles(rolesDialog?.id || '');

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { isActive?: boolean; isAdmin?: boolean };
    }) => adminApi.updateUser(userId, data),
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

  const setUserRolesMutation = useSetUserRoles();

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

  const openRolesDialog = (user: AdminUser) => {
    setRolesDialog(user);
    // Selected roles will be loaded from useUserRoles
  };

  // Update selected roles when userRoles changes
  useEffect(() => {
    if (rolesDialog && userRoles && selectedRoles.size === 0) {
      const roleIds = new Set(userRoles.map((r) => r.id));
      if (roleIds.size > 0) {
        setSelectedRoles(roleIds);
      }
    }
  }, [rolesDialog, userRoles]); // eslint-disable-line

  const handleSaveRoles = () => {
    if (!rolesDialog) return;

    setUserRolesMutation.mutate(
      {
        userId: rolesDialog.id,
        data: { roleIds: Array.from(selectedRoles) },
      },
      {
        onSuccess: () => {
          notify.success('User roles updated');
          setRolesDialog(null);
          setSelectedRoles(new Set());
          queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to update user roles');
        },
      }
    );
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const closeRolesDialog = () => {
    setRolesDialog(null);
    setSelectedRoles(new Set());
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
                  <Tooltip
                    title={user.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                  >
                    <Switch
                      checked={user.isActive}
                      onChange={() => handleToggleActive(user)}
                      disabled={user.id === currentUser?.id || !canUpdateUsers}
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
                  <Tooltip
                    title={user.isAdmin ? 'Admin - Click to revoke' : 'User - Click to grant admin'}
                  >
                    <Switch
                      checked={user.isAdmin}
                      onChange={() => handleToggleAdmin(user)}
                      disabled={user.id === currentUser?.id || !canUpdateUsers}
                      color="primary"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {canUpdateUsers && (
                      <Tooltip title="Manage roles">
                        <IconButton onClick={() => openRolesDialog(user)}>
                          <Security />
                        </IconButton>
                      </Tooltip>
                    )}
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
                  </Stack>
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

      {/* Roles Dialog */}
      <Dialog open={!!rolesDialog} onClose={closeRolesDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Roles - {rolesDialog?.email}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select roles to assign to this user:
          </Typography>
          <FormGroup>
            {roles?.map((role) => (
              <FormControlLabel
                key={role.id}
                control={
                  <Checkbox
                    checked={selectedRoles.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                }
                label={
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>{role.name}</Typography>
                      {role.isSystem && (
                        <Chip label="System" size="small" variant="outlined" color="primary" />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {role.description || 'No description'}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRolesDialog}>Cancel</Button>
          <Button
            onClick={handleSaveRoles}
            variant="contained"
            disabled={setUserRolesMutation.isPending}
          >
            {setUserRolesMutation.isPending ? 'Saving...' : 'Save Roles'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog?.email}</strong>? This action
            cannot be undone.
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
