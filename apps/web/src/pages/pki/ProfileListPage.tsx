// ===========================================
// Certificate Profile List Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useProfileList, useDeleteProfile } from '../../hooks/useCertificateProfiles.js';

export function ProfileListPage() {
  const navigate = useNavigate();
  const notify = useNotification();
  const { data, isLoading, error } = useProfileList({ limit: 100 });
  const deleteMutation = useDeleteProfile();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) return <PageLoader message="Loading certificate profiles..." />;
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load certificate profiles</Typography></Container>;

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { notify.success('Profile deleted'); setDeleteId(null); },
      onError: (err: Error) => notify.error(err.message || 'Failed to delete profile'),
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Certificate Profiles</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/pki/profiles/create')}>
          Create Profile
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Key Algorithms</TableCell>
              <TableCell>Max Validity</TableCell>
              <TableCell>Key Usage</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map(profile => (
              <TableRow key={profile.id} hover>
                <TableCell>{profile.name}</TableCell>
                <TableCell><Chip label={profile.certType} size="small" /></TableCell>
                <TableCell>{profile.allowedKeyAlgorithms.join(', ').toUpperCase()}</TableCell>
                <TableCell>{profile.maxValidityDays} days</TableCell>
                <TableCell>
                  {profile.keyUsage.slice(0, 3).map(ku => (
                    <Chip key={ku} label={ku} size="small" variant="outlined" sx={{ mr: 0.5 }} />
                  ))}
                  {profile.keyUsage.length > 3 && <Chip label={`+${profile.keyUsage.length - 3}`} size="small" />}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/pki/profiles/${profile.id}`)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteId(profile.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <TableRow><TableCell colSpan={6} align="center">No certificate profiles found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this certificate profile? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
