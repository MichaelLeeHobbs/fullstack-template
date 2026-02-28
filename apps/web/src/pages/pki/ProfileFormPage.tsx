// ===========================================
// Certificate Profile Form Page
// ===========================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, MenuItem,
  FormGroup, FormControlLabel, Checkbox, Alert,
} from '@mui/material';
import { PageLoader } from '../../components/LoadingSpinner.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useProfile, useCreateProfile, useUpdateProfile } from '../../hooks/useCertificateProfiles.js';
import type { CreateProfileInput } from '@fullstack-template/shared';

const KEY_USAGE_OPTIONS = [
  'digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment',
  'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly',
];

const EXT_KEY_USAGE_OPTIONS = [
  'serverAuth', 'clientAuth', 'codeSigning', 'emailProtection',
  'timeStamping', 'OCSPSigning',
];

export function ProfileFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotification();
  const isEditing = !!id;

  const { data: existing, isLoading } = useProfile(id ?? '');
  const createMutation = useCreateProfile();
  const updateMutation = useUpdateProfile();

  const [formData, setFormData] = useState<Partial<CreateProfileInput>>({
    certType: 'server',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: [],
    extKeyUsage: [],
    maxValidityDays: 365,
  });

  useEffect(() => {
    if (existing) {
      setFormData({
        name: existing.name,
        description: existing.description ?? undefined,
        certType: existing.certType as CreateProfileInput['certType'],
        allowedKeyAlgorithms: existing.allowedKeyAlgorithms as ('rsa' | 'ecdsa')[],
        minKeySize: existing.minKeySize,
        keyUsage: existing.keyUsage,
        extKeyUsage: existing.extKeyUsage,
        maxValidityDays: existing.maxValidityDays,
        basicConstraints: existing.basicConstraints,
      });
    }
  }, [existing]);

  if (isEditing && isLoading) return <PageLoader message="Loading profile..." />;

  const updateField = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field: 'keyUsage' | 'extKeyUsage', item: string) => {
    const arr = formData[field] ?? [];
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    updateField(field, newArr);
  };

  const handleSubmit = () => {
    if (isEditing) {
      updateMutation.mutate({ id, data: formData }, {
        onSuccess: () => { notify.success('Profile updated'); navigate('/pki/profiles'); },
        onError: (err: Error) => notify.error(err.message || 'Failed to update profile'),
      });
    } else {
      createMutation.mutate(formData as CreateProfileInput, {
        onSuccess: () => { notify.success('Profile created'); navigate('/pki/profiles'); },
        onError: (err: Error) => notify.error(err.message || 'Failed to create profile'),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>{isEditing ? 'Edit' : 'Create'} Certificate Profile</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Name" value={formData.name ?? ''} onChange={(e) => updateField('name', e.target.value)} required />
          <TextField label="Description" value={formData.description ?? ''} onChange={(e) => updateField('description', e.target.value)} multiline rows={2} />
          <TextField select label="Certificate Type" value={formData.certType ?? 'server'} onChange={(e) => updateField('certType', e.target.value)}>
            <MenuItem value="server">Server</MenuItem>
            <MenuItem value="client">Client</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="ca">CA</MenuItem>
            <MenuItem value="smime">S/MIME</MenuItem>
          </TextField>
          <TextField label="Min Key Size" type="number" value={formData.minKeySize ?? 2048} onChange={(e) => updateField('minKeySize', Number(e.target.value))} />
          <TextField label="Max Validity (days)" type="number" value={formData.maxValidityDays ?? 365} onChange={(e) => updateField('maxValidityDays', Number(e.target.value))} />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>Allowed Key Algorithms</Typography>
          <FormGroup row>
            {(['rsa', 'ecdsa'] as const).map(alg => (
              <FormControlLabel
                key={alg}
                control={
                  <Checkbox
                    checked={formData.allowedKeyAlgorithms?.includes(alg) ?? false}
                    onChange={() => {
                      const algs = formData.allowedKeyAlgorithms ?? [];
                      const newAlgs = algs.includes(alg) ? algs.filter(a => a !== alg) : [...algs, alg];
                      updateField('allowedKeyAlgorithms', newAlgs);
                    }}
                  />
                }
                label={alg.toUpperCase()}
              />
            ))}
          </FormGroup>

          <Typography variant="subtitle2" sx={{ mt: 1 }}>Key Usage</Typography>
          <FormGroup row>
            {KEY_USAGE_OPTIONS.map(ku => (
              <FormControlLabel
                key={ku}
                control={<Checkbox checked={formData.keyUsage?.includes(ku) ?? false} onChange={() => toggleArrayItem('keyUsage', ku)} />}
                label={ku}
              />
            ))}
          </FormGroup>

          <Typography variant="subtitle2" sx={{ mt: 1 }}>Extended Key Usage</Typography>
          <FormGroup row>
            {EXT_KEY_USAGE_OPTIONS.map(eku => (
              <FormControlLabel
                key={eku}
                control={<Checkbox checked={formData.extKeyUsage?.includes(eku) ?? false} onChange={() => toggleArrayItem('extKeyUsage', eku)} />}
                label={eku}
              />
            ))}
          </FormGroup>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => navigate('/pki/profiles')}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!formData.name || !formData.keyUsage?.length || isPending}
        >
          {isPending ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
        </Button>
      </Box>
    </Container>
  );
}
