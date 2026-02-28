// ===========================================
// Certificate Issue Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, MenuItem,
  Stepper, Step, StepLabel, Alert, IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification.js';
import { useIssueCertificate } from '../../hooks/useCertificates.js';
import { useCaHierarchy } from '../../hooks/useCa.js';
import { useProfileList } from '../../hooks/useCertificateProfiles.js';
import type { IssueCertificateInput } from '../../types/pki.js';

const steps = ['CA & Profile', 'Subject Information', 'Key & Validity', 'Review'];

export function CertificateIssuePage() {
  const navigate = useNavigate();
  const notify = useNotification();
  const issueMutation = useIssueCertificate();
  const { data: cas } = useCaHierarchy();
  const { data: profiles } = useProfileList({ limit: 100 });

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<IssueCertificateInput>>({
    keyAlgorithm: 'rsa',
    keySize: 2048,
    validityDays: 365,
    sans: [],
  });

  const activeCas = cas?.filter(ca => ca.status === 'active') ?? [];

  const updateField = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const addSan = () => {
    const sans = [...(formData.sans ?? []), { type: 'dns' as const, value: '' }];
    updateField('sans', sans);
  };

  const updateSan = (index: number, field: 'type' | 'value', value: string) => {
    const sans = [...(formData.sans ?? [])];
    sans[index] = { ...sans[index]!, [field]: value };
    updateField('sans', sans);
  };

  const removeSan = (index: number) => {
    const sans = (formData.sans ?? []).filter((_, i) => i !== index);
    updateField('sans', sans);
  };

  const handleSubmit = () => {
    const payload = { ...formData };
    if (!payload.sans?.length) delete payload.sans;
    issueMutation.mutate(payload as IssueCertificateInput, {
      onSuccess: (result) => {
        notify.success('Certificate issued successfully');
        navigate(`/pki/certificates/${result.certificate.id}`);
      },
      onError: (err: Error) => notify.error(err.message || 'Failed to issue certificate'),
    });
  };

  const handleNext = () => setActiveStep(s => s + 1);
  const handleBack = () => setActiveStep(s => s - 1);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField select label="Issuing CA" value={formData.caId ?? ''} onChange={(e) => updateField('caId', e.target.value)} required>
              {activeCas.map(ca => <MenuItem key={ca.id} value={ca.id}>{ca.name} ({ca.commonName})</MenuItem>)}
            </TextField>
            <TextField label="CA Passphrase" type="password" value={formData.caPassphrase ?? ''} onChange={(e) => updateField('caPassphrase', e.target.value)} required />
            <TextField select label="Certificate Profile (optional)" value={formData.profileId ?? ''} onChange={(e) => updateField('profileId', e.target.value || undefined)}>
              <MenuItem value="">None</MenuItem>
              {profiles?.data?.map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.certType})</MenuItem>)}
            </TextField>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Common Name (CN)" value={formData.commonName ?? ''} onChange={(e) => updateField('commonName', e.target.value)} required />
            <TextField label="Organization (O)" value={formData.organization ?? ''} onChange={(e) => updateField('organization', e.target.value)} />
            <TextField label="Organizational Unit (OU)" value={formData.organizationalUnit ?? ''} onChange={(e) => updateField('organizationalUnit', e.target.value)} />
            <TextField label="Country (C)" value={formData.country ?? ''} onChange={(e) => updateField('country', e.target.value)} inputProps={{ maxLength: 2 }} />
            <TextField label="State (ST)" value={formData.state ?? ''} onChange={(e) => updateField('state', e.target.value)} />
            <TextField label="Locality (L)" value={formData.locality ?? ''} onChange={(e) => updateField('locality', e.target.value)} />
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Subject Alternative Names</Typography>
            {formData.sans?.map((san, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField select size="small" value={san.type} onChange={(e) => updateSan(i, 'type', e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="dns">DNS</MenuItem>
                  <MenuItem value="ip">IP</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="uri">URI</MenuItem>
                </TextField>
                <TextField size="small" fullWidth value={san.value} onChange={(e) => updateSan(i, 'value', e.target.value)} placeholder="Value" />
                <IconButton size="small" onClick={() => removeSan(i)}><Delete fontSize="small" /></IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<Add />} onClick={addSan}>Add SAN</Button>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField select label="Key Algorithm" value={formData.keyAlgorithm ?? 'rsa'} onChange={(e) => updateField('keyAlgorithm', e.target.value)}>
              <MenuItem value="rsa">RSA</MenuItem>
              <MenuItem value="ecdsa">ECDSA</MenuItem>
            </TextField>
            {formData.keyAlgorithm === 'rsa' && (
              <TextField select label="Key Size" value={formData.keySize ?? 2048} onChange={(e) => updateField('keySize', Number(e.target.value))}>
                <MenuItem value={2048}>2048 bits</MenuItem>
                <MenuItem value={4096}>4096 bits</MenuItem>
              </TextField>
            )}
            {formData.keyAlgorithm === 'ecdsa' && (
              <TextField select label="Curve" value={formData.keyCurve ?? 'P-256'} onChange={(e) => updateField('keyCurve', e.target.value)}>
                <MenuItem value="P-256">P-256</MenuItem>
                <MenuItem value="P-384">P-384</MenuItem>
              </TextField>
            )}
            <TextField label="Validity (days)" type="number" value={formData.validityDays ?? 365} onChange={(e) => updateField('validityDays', Number(e.target.value))} />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>Review the certificate configuration before issuing.</Alert>
            <Typography><strong>Issuing CA:</strong> {activeCas.find(ca => ca.id === formData.caId)?.name}</Typography>
            <Typography><strong>Common Name:</strong> {formData.commonName}</Typography>
            {formData.organization && <Typography><strong>Organization:</strong> {formData.organization}</Typography>}
            <Typography><strong>Key:</strong> {formData.keyAlgorithm?.toUpperCase()} {formData.keyAlgorithm === 'rsa' ? `${formData.keySize} bits` : formData.keyCurve}</Typography>
            <Typography><strong>Validity:</strong> {formData.validityDays} days</Typography>
            {formData.sans && formData.sans.length > 0 && (
              <Typography><strong>SANs:</strong> {formData.sans.map(s => `${s.type}:${s.value}`).join(', ')}</Typography>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return !!formData.caId && !!formData.caPassphrase;
      case 1: return !!formData.commonName;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Issue Certificate</Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper sx={{ p: 3, mb: 3 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => activeStep === 0 ? navigate('/pki/certificates') : handleBack()} disabled={issueMutation.isPending}>
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={!canProceed()}>Next</Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={issueMutation.isPending}>
            {issueMutation.isPending ? 'Issuing...' : 'Issue Certificate'}
          </Button>
        )}
      </Box>
    </Container>
  );
}
