// ===========================================
// Admin Roles Page
// ===========================================
// Role management with list, create, edit, and delete.

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
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, Lock } from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification.js';
import { PageLoader } from '../../components/LoadingSpinner.js';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissionsGrouped,
  useSetRolePermissions,
} from '../../hooks/useRoles.js';
import type { Role, Permission } from '../../types/role.js';

export function RolesPage() {
  const notify = useNotification();

  // State
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<Role | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Role | null>(null);
  const [permissionsDialog, setPermissionsDialog] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Queries
  const { data: roles, isLoading, error } = useRoles();
  const { data: permissionsGrouped } = usePermissionsGrouped();

  // Mutations
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const setPermissionsMutation = useSetRolePermissions();

  const handleCreate = () => {
    createMutation.mutate(
      { name: formData.name, description: formData.description || undefined },
      {
        onSuccess: () => {
          notify.success('Role created');
          setCreateDialog(false);
          setFormData({ name: '', description: '' });
        },
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to create role');
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editDialog) return;

    updateMutation.mutate(
      {
        id: editDialog.id,
        data: { name: formData.name, description: formData.description || undefined },
      },
      {
        onSuccess: () => {
          notify.success('Role updated');
          setEditDialog(null);
          setFormData({ name: '', description: '' });
        },
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to update role');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteDialog) return;

    deleteMutation.mutate(deleteDialog.id, {
      onSuccess: () => {
        notify.success('Role deleted');
        setDeleteDialog(null);
      },
      onError: (err: Error) => {
        notify.error(err.message || 'Failed to delete role');
      },
    });
  };

  const handleSavePermissions = () => {
    if (!permissionsDialog) return;

    setPermissionsMutation.mutate(
      {
        roleId: permissionsDialog.id,
        data: { permissionIds: Array.from(selectedPermissions) },
      },
      {
        onSuccess: () => {
          notify.success('Permissions updated');
          setPermissionsDialog(null);
          setSelectedPermissions(new Set());
        },
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to update permissions');
        },
      }
    );
  };

  const openEditDialog = (role: Role) => {
    setFormData({ name: role.name, description: role.description || '' });
    setEditDialog(role);
  };

  const openPermissionsDialog = (role: Role) => {
    setSelectedPermissions(new Set(role.permissions.map((p) => p.id)));
    setPermissionsDialog(role);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const toggleResourcePermissions = (permissions: Permission[]) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      const allSelected = permissions.every((p) => newSet.has(p.id));

      if (allSelected) {
        permissions.forEach((p) => newSet.delete(p.id));
      } else {
        permissions.forEach((p) => newSet.add(p.id));
      }
      return newSet;
    });
  };

  if (isLoading) return <PageLoader message="Loading roles..." />;

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">Failed to load roles</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Role Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>
          Create Role
        </Button>
      </Box>

      {/* Roles Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>{role.name}</Typography>
                    {role.isSystem && (
                      <Tooltip title="System role - cannot be modified">
                        <Lock fontSize="small" color="disabled" />
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {role.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {role.permissions.slice(0, 3).map((p) => (
                      <Chip key={p.id} label={p.name} size="small" variant="outlined" />
                    ))}
                    {role.permissions.length > 3 && (
                      <Chip
                        label={`+${role.permissions.length - 3} more`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => openPermissionsDialog(role)}
                      />
                    )}
                    {role.permissions.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No permissions
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit permissions">
                    <span>
                      <IconButton
                        onClick={() => openPermissionsDialog(role)}
                        disabled={role.isSystem}
                      >
                        <Edit />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete role">
                    <span>
                      <IconButton
                        color="error"
                        onClick={() => setDeleteDialog(role)}
                        disabled={role.isSystem}
                      >
                        <Delete />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {roles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No roles found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.name || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!formData.name || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog
        open={!!permissionsDialog}
        onClose={() => setPermissionsDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Permissions - {permissionsDialog?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select permissions for this role:
          </Typography>
          {permissionsGrouped &&
            Object.entries(permissionsGrouped).map(([resource, permissions]) => (
              <Accordion key={resource} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.every((p) => selectedPermissions.has(p.id))}
                        indeterminate={
                          permissions.some((p) => selectedPermissions.has(p.id)) &&
                          !permissions.every((p) => selectedPermissions.has(p.id))
                        }
                        onChange={() => toggleResourcePermissions(permissions)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label={
                      <Typography sx={{ textTransform: 'capitalize' }}>{resource}</Typography>
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup sx={{ pl: 3 }}>
                    {permissions.map((permission) => (
                      <FormControlLabel
                        key={permission.id}
                        control={
                          <Checkbox
                            checked={selectedPermissions.has(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{permission.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialog(null)}>Cancel</Button>
          <Button
            onClick={handleSavePermissions}
            variant="contained"
            disabled={setPermissionsMutation.isPending}
          >
            {setPermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog?.name}</strong>? Users with this
            role will lose these permissions. This action cannot be undone.
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

export default RolesPage;
