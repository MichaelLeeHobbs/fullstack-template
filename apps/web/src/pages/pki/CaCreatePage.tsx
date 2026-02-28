// ===========================================
// CA Create Page
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, MenuItem,
  Stepper, Step, StepLabel, Alert, FormControlLabel, Switch,
} from '@mui/material';
import { useNotification } from '../../hooks/useNotification.js';
import { useCreateCa, useCaHierarchy } from '../../hooks/useCa.js';
import type { CreateCaInput } from '@fullstack-template/shared';

const steps = ['CA Type', 'Subject Information', 'Key & Validity', 'Review'];

export function CaCreatePage() {
  const navigate = useNavigate();
  const notify = useNotification();
  const createMutation = useCreateCa();
  const { data: cas } = useCaHierarchy();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<CreateCaInput>>({
    keyAlgorithm: 'rsa',
    keySize: 4096,
    validityDays: 3650,
    maxValidityDays: 365,
    defaultValidityDays: 365,
  });
  const [isIntermediate, setIsIntermediate] = useState(false);

  const activeCas = cas?.filter(ca => ca.status === 'active') ?? [];

  const handleNext = () => setActiveStep(s => s + 1);
  const handleBack = () => setActiveStep(s => s - 1);
  const updateField = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    createMutation.mutate(formData as CreateCaInput, {
      onSuccess: (ca) => {
        notify.success(`Certificate Authority "${ca.name}" created`);
        navigate(`/pki/ca/${ca.id}`);
      },
      onError: (err: Error) => {
        notify.error(err.message || 'Failed to create CA');
      },
    });
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={isIntermediate} onChange={(e) => {
                setIsIntermediate(e.target.checked);
                if (!e.target.checked) {
                  updateField('parentCaId', undefined);
                  updateField('parentCaPassphrase', undefined);
                }
              }} />}
              label="Create as Intermediate CA (signed by parent)"
            />
            {isIntermediate && (
              <>
                <TextField
                  select
                  label="Parent CA"
                  value={formData.parentCaId ?? ''}
                  onChange={(e) => updateField('parentCaId', e.target.value)}
                  required
                >
                  {activeCas.map(ca => (
                    <MenuItem key={ca.id} value={ca.id}>{ca.name} ({ca.commonName})</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Parent CA Passphrase"
                  type="password"
                  value={formData.parentCaPassphrase ?? ''}
                  onChange={(e) => updateField('parentCaPassphrase', e.target.value)}
                  required
                />
              </>
            )}
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="CA Name" value={formData.name ?? ''} onChange={(e) => updateField('name', e.target.value)} required />
            <TextField label="Description" value={formData.description ?? ''} onChange={(e) => updateField('description', e.target.value)} multiline rows={2} />
            <TextField label="Common Name (CN)" value={formData.commonName ?? ''} onChange={(e) => updateField('commonName', e.target.value)} required />
            <TextField label="Organization (O)" value={formData.organization ?? ''} onChange={(e) => updateField('organization', e.target.value)} />
            <TextField label="Organizational Unit (OU)" value={formData.organizationalUnit ?? ''} onChange={(e) => updateField('organizationalUnit', e.target.value)} />
            <TextField label="Country (C)" value={formData.country ?? ''} onChange={(e) => updateField('country', e.target.value)} inputProps={{ maxLength: 2 }} />
            <TextField label="State (ST)" value={formData.state ?? ''} onChange={(e) => updateField('state', e.target.value)} />
            <TextField label="Locality (L)" value={formData.locality ?? ''} onChange={(e) => updateField('locality', e.target.value)} />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Passphrase" type="password" value={formData.passphrase ?? ''} onChange={(e) => updateField('passphrase', e.target.value)} required helperText="Encrypt the CA private key" />
            <TextField select label="Key Algorithm" value={formData.keyAlgorithm ?? 'rsa'} onChange={(e) => updateField('keyAlgorithm', e.target.value)}>
              <MenuItem value="rsa">RSA</MenuItem>
              <MenuItem value="ecdsa">ECDSA</MenuItem>
            </TextField>
            {formData.keyAlgorithm === 'rsa' && (
              <TextField select label="Key Size" value={formData.keySize ?? 4096} onChange={(e) => updateField('keySize', Number(e.target.value))}>
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
            <TextField label="CA Validity (days)" type="number" value={formData.validityDays ?? 3650} onChange={(e) => updateField('validityDays', Number(e.target.value))} />
            <TextField label="Max Certificate Validity (days)" type="number" value={formData.maxValidityDays ?? 365} onChange={(e) => updateField('maxValidityDays', Number(e.target.value))} />
            <TextField label="Default Certificate Validity (days)" type="number" value={formData.defaultValidityDays ?? 365} onChange={(e) => updateField('defaultValidityDays', Number(e.target.value))} />
            {!isIntermediate && (
              <TextField label="Path Length Constraint" type="number" value={formData.pathLenConstraint ?? ''} onChange={(e) => updateField('pathLenConstraint', e.target.value ? Number(e.target.value) : undefined)} helperText="Leave empty for no constraint" />
            )}
            <TextField label="CRL Distribution URL" value={formData.crlDistributionUrl ?? ''} onChange={(e) => updateField('crlDistributionUrl', e.target.value)} />
            <TextField label="OCSP URL" value={formData.ocspUrl ?? ''} onChange={(e) => updateField('ocspUrl', e.target.value)} />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>Review the CA configuration before creating.</Alert>
            <Typography><strong>Type:</strong> {isIntermediate ? 'Intermediate' : 'Root'} CA</Typography>
            {isIntermediate && <Typography><strong>Parent CA:</strong> {activeCas.find(ca => ca.id === formData.parentCaId)?.name}</Typography>}
            <Typography><strong>Name:</strong> {formData.name}</Typography>
            <Typography><strong>Common Name:</strong> {formData.commonName}</Typography>
            {formData.organization && <Typography><strong>Organization:</strong> {formData.organization}</Typography>}
            <Typography><strong>Key:</strong> {formData.keyAlgorithm?.toUpperCase()} {formData.keyAlgorithm === 'rsa' ? `${formData.keySize} bits` : formData.keyCurve}</Typography>
            <Typography><strong>Validity:</strong> {formData.validityDays} days</Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return !isIntermediate || (!!formData.parentCaId && !!formData.parentCaPassphrase);
      case 1: return !!formData.name && !!formData.commonName;
      case 2: return !!formData.passphrase;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Create Certificate Authority</Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper sx={{ p: 3, mb: 3 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => activeStep === 0 ? navigate('/pki/ca') : handleBack()} disabled={createMutation.isPending}>
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={!canProceed()}>Next</Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create CA'}
          </Button>
        )}
      </Box>
    </Container>
  );
}
