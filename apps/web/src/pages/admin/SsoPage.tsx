// ===========================================
// Admin SSO Management Page
// ===========================================
// CRUD management for SSO providers.

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
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification.js';
import { PageLoader } from '../../components/LoadingSpinner.js';
import {
  useAdminSsoProviders,
  useCreateSsoProvider,
  useUpdateSsoProvider,
  useDeleteSsoProvider,
  useToggleSsoProvider,
} from '../../hooks/useSso.js';
import { useRoles } from '../../hooks/useRoles.js';
import type { SsoProviderAdmin, SsoProtocol } from '@fullstack-template/shared';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

interface ProviderFormData {
  slug: string;
  name: string;
  protocol: SsoProtocol;
  isEnabled: boolean;
  autoCreateUsers: boolean;
  defaultRoleId: string;
  allowedDomains: string;
  // OIDC fields
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  // SAML fields
  entryPoint: string;
  issuer: string;
  cert: string;
  signatureAlgorithm: string;
}

const defaultFormData: ProviderFormData = {
  slug: '',
  name: '',
  protocol: 'oidc',
  isEnabled: false,
  autoCreateUsers: true,
  defaultRoleId: '',
  allowedDomains: '',
  issuerUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: 'openid profile email',
  entryPoint: '',
  issuer: '',
  cert: '',
  signatureAlgorithm: 'sha256',
};

function buildCreatePayload(form: ProviderFormData) {
  const base = {
    slug: form.slug,
    name: form.name,
    isEnabled: form.isEnabled,
    autoCreateUsers: form.autoCreateUsers,
    defaultRoleId: form.defaultRoleId || null,
    allowedDomains: form.allowedDomains ? form.allowedDomains.split(',').map((d) => d.trim()).filter(Boolean) : [],
  };

  if (form.protocol === 'oidc') {
    return {
      ...base,
      protocol: 'oidc' as const,
      config: {
        issuerUrl: form.issuerUrl,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        scopes: form.scopes.split(' ').filter(Boolean),
      },
    };
  }
  return {
    ...base,
    protocol: 'saml' as const,
    config: {
      entryPoint: form.entryPoint,
      issuer: form.issuer,
      cert: form.cert,
      signatureAlgorithm: form.signatureAlgorithm as 'sha256',
    },
  };
}

function buildUpdatePayload(form: ProviderFormData, original: SsoProviderAdmin) {
  const updates: Record<string, unknown> = {};
  if (form.name !== original.name) updates.name = form.name;
  if (form.slug !== original.slug) updates.slug = form.slug;
  if (form.autoCreateUsers !== original.autoCreateUsers) updates.autoCreateUsers = form.autoCreateUsers;

  const newDefaultRoleId = form.defaultRoleId || null;
  if (newDefaultRoleId !== original.defaultRoleId) updates.defaultRoleId = newDefaultRoleId;

  const domains = form.allowedDomains ? form.allowedDomains.split(',').map((d) => d.trim()).filter(Boolean) : [];
  if (JSON.stringify(domains) !== JSON.stringify(original.allowedDomains)) updates.allowedDomains = domains;

  if (original.protocol === 'oidc') {
    const config: Record<string, unknown> = {};
    if (form.issuerUrl) config.issuerUrl = form.issuerUrl;
    if (form.clientId) config.clientId = form.clientId;
    if (form.clientSecret && form.clientSecret !== '••••••••') config.clientSecret = form.clientSecret;
    if (form.scopes) config.scopes = form.scopes.split(' ').filter(Boolean);
    if (Object.keys(config).length > 0) updates.config = config;
  } else {
    const config: Record<string, unknown> = {};
    if (form.entryPoint) config.entryPoint = form.entryPoint;
    if (form.issuer) config.issuer = form.issuer;
    if (form.cert) config.cert = form.cert;
    if (form.signatureAlgorithm) config.signatureAlgorithm = form.signatureAlgorithm;
    if (Object.keys(config).length > 0) updates.config = config;
  }

  return updates;
}

function providerToFormData(provider: SsoProviderAdmin): ProviderFormData {
  const config = provider.config as Record<string, unknown>;
  return {
    slug: provider.slug,
    name: provider.name,
    protocol: provider.protocol,
    isEnabled: provider.isEnabled,
    autoCreateUsers: provider.autoCreateUsers,
    defaultRoleId: provider.defaultRoleId || '',
    allowedDomains: provider.allowedDomains.join(', '),
    issuerUrl: (config.issuerUrl as string) || '',
    clientId: (config.clientId as string) || '',
    clientSecret: (config.clientSecret as string) || '',
    scopes: Array.isArray(config.scopes) ? (config.scopes as string[]).join(' ') : 'openid profile email',
    entryPoint: (config.entryPoint as string) || '',
    issuer: (config.issuer as string) || '',
    cert: (config.cert as string) || '',
    signatureAlgorithm: (config.signatureAlgorithm as string) || 'sha256',
  };
}

export function SsoPage() {
  const notify = useNotification();

  // State
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<SsoProviderAdmin | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<SsoProviderAdmin | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>(defaultFormData);
  const [tabIndex, setTabIndex] = useState(0);

  // Queries
  const { data: providers, isLoading, error } = useAdminSsoProviders();
  const { data: roles } = useRoles();

  // Mutations
  const createMutation = useCreateSsoProvider();
  const updateMutation = useUpdateSsoProvider();
  const deleteMutation = useDeleteSsoProvider();
  const toggleMutation = useToggleSsoProvider();

  const updateField = (field: keyof ProviderFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    const payload = buildCreatePayload(formData);
    createMutation.mutate(payload, {
      onSuccess: () => {
        notify.success('SSO provider created');
        setCreateDialog(false);
        setFormData(defaultFormData);
        setTabIndex(0);
      },
      onError: (err: Error) => {
        notify.error(err.message || 'Failed to create SSO provider');
      },
    });
  };

  const handleUpdate = () => {
    if (!editDialog) return;
    const payload = buildUpdatePayload(formData, editDialog);
    updateMutation.mutate(
      { id: editDialog.id, data: payload },
      {
        onSuccess: () => {
          notify.success('SSO provider updated');
          setEditDialog(null);
          setFormData(defaultFormData);
          setTabIndex(0);
        },
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to update SSO provider');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteDialog) return;
    deleteMutation.mutate(deleteDialog.id, {
      onSuccess: () => {
        notify.success('SSO provider deleted');
        setDeleteDialog(null);
      },
      onError: (err: Error) => {
        notify.error(err.message || 'Failed to delete SSO provider');
      },
    });
  };

  const handleToggle = (provider: SsoProviderAdmin) => {
    toggleMutation.mutate(
      { id: provider.id, isEnabled: !provider.isEnabled },
      {
        onError: (err: Error) => {
          notify.error(err.message || 'Failed to toggle SSO provider');
        },
      },
    );
  };

  const openEditDialog = (provider: SsoProviderAdmin) => {
    setFormData(providerToFormData(provider));
    setEditDialog(provider);
    setTabIndex(0);
  };

  if (isLoading) return <PageLoader message="Loading SSO providers..." />;

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">Failed to load SSO providers</Typography>
      </Container>
    );
  }

  const renderGeneralTab = () => (
    <>
      <TextField
        autoFocus
        margin="dense"
        label="Name"
        fullWidth
        value={formData.name}
        onChange={(e) => updateField('name', e.target.value)}
        helperText="Display name shown on the login page"
      />
      <TextField
        margin="dense"
        label="Slug"
        fullWidth
        value={formData.slug}
        onChange={(e) => updateField('slug', e.target.value)}
        helperText="URL-safe identifier (e.g., my-company-okta)"
      />
      {!editDialog && (
        <FormControl fullWidth margin="dense">
          <InputLabel>Protocol</InputLabel>
          <Select
            value={formData.protocol}
            label="Protocol"
            onChange={(e) => updateField('protocol', e.target.value)}
          >
            <MenuItem value="oidc">OpenID Connect (OIDC)</MenuItem>
            <MenuItem value="saml">SAML 2.0</MenuItem>
          </Select>
        </FormControl>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={formData.isEnabled}
            onChange={(e) => updateField('isEnabled', e.target.checked)}
          />
        }
        label="Enabled"
        sx={{ mt: 1 }}
      />
    </>
  );

  const renderOidcTab = () => (
    <>
      <TextField
        margin="dense"
        label="Issuer URL"
        fullWidth
        value={formData.issuerUrl}
        onChange={(e) => updateField('issuerUrl', e.target.value)}
        helperText="e.g., https://accounts.google.com or https://login.microsoftonline.com/{tenant}/v2.0"
      />
      <TextField
        margin="dense"
        label="Client ID"
        fullWidth
        value={formData.clientId}
        onChange={(e) => updateField('clientId', e.target.value)}
      />
      <TextField
        margin="dense"
        label="Client Secret"
        fullWidth
        type="password"
        value={formData.clientSecret}
        onChange={(e) => updateField('clientSecret', e.target.value)}
      />
      <TextField
        margin="dense"
        label="Scopes"
        fullWidth
        value={formData.scopes}
        onChange={(e) => updateField('scopes', e.target.value)}
        helperText="Space-separated (e.g., openid profile email)"
      />
    </>
  );

  const renderSamlTab = () => (
    <>
      <TextField
        margin="dense"
        label="Entry Point (SSO URL)"
        fullWidth
        value={formData.entryPoint}
        onChange={(e) => updateField('entryPoint', e.target.value)}
        helperText="IdP Single Sign-On URL"
      />
      <TextField
        margin="dense"
        label="Issuer / Entity ID"
        fullWidth
        value={formData.issuer}
        onChange={(e) => updateField('issuer', e.target.value)}
      />
      <TextField
        margin="dense"
        label="Certificate"
        fullWidth
        multiline
        rows={4}
        value={formData.cert}
        onChange={(e) => updateField('cert', e.target.value)}
        helperText="IdP X.509 certificate (PEM format, no headers)"
      />
      <FormControl fullWidth margin="dense">
        <InputLabel>Signature Algorithm</InputLabel>
        <Select
          value={formData.signatureAlgorithm}
          label="Signature Algorithm"
          onChange={(e) => updateField('signatureAlgorithm', e.target.value)}
        >
          <MenuItem value="sha1">SHA-1</MenuItem>
          <MenuItem value="sha256">SHA-256</MenuItem>
          <MenuItem value="sha512">SHA-512</MenuItem>
        </Select>
      </FormControl>
    </>
  );

  const renderProvisioningTab = () => (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={formData.autoCreateUsers}
            onChange={(e) => updateField('autoCreateUsers', e.target.checked)}
          />
        }
        label="Automatically create users on first SSO login"
        sx={{ mt: 1 }}
      />
      <FormControl fullWidth margin="dense">
        <InputLabel>Default Role</InputLabel>
        <Select
          value={formData.defaultRoleId}
          label="Default Role"
          onChange={(e) => updateField('defaultRoleId', e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {roles?.map((role) => (
            <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        margin="dense"
        label="Allowed Domains"
        fullWidth
        value={formData.allowedDomains}
        onChange={(e) => updateField('allowedDomains', e.target.value)}
        helperText="Comma-separated email domains (empty = all domains)"
      />
    </>
  );

  const renderFormDialog = () => (
    <>
      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
        <Tab label="General" />
        <Tab
          label={editDialog ? editDialog.protocol.toUpperCase() : formData.protocol.toUpperCase()}
        />
        <Tab label="Provisioning" />
      </Tabs>
      <TabPanel value={tabIndex} index={0}>{renderGeneralTab()}</TabPanel>
      <TabPanel value={tabIndex} index={1}>
        {(editDialog?.protocol || formData.protocol) === 'oidc' ? renderOidcTab() : renderSamlTab()}
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>{renderProvisioningTab()}</TabPanel>
    </>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">SSO Providers</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => { setFormData(defaultFormData); setTabIndex(0); setCreateDialog(true); }}
        >
          Add Provider
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers?.map((provider) => (
              <TableRow key={provider.id} hover>
                <TableCell>{provider.name}</TableCell>
                <TableCell>
                  <Chip
                    label={provider.protocol.toUpperCase()}
                    size="small"
                    color={provider.protocol === 'oidc' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {provider.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={provider.isEnabled ? 'Enabled' : 'Disabled'}
                    size="small"
                    color={provider.isEnabled ? 'success' : 'default'}
                    onClick={() => handleToggle(provider)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit provider">
                    <IconButton onClick={() => openEditDialog(provider)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete provider">
                    <IconButton color="error" onClick={() => setDeleteDialog(provider)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {providers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No SSO providers configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add SSO Provider</DialogTitle>
        <DialogContent>{renderFormDialog()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.name || !formData.slug || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editDialog}
        onClose={() => setEditDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit SSO Provider</DialogTitle>
        <DialogContent>{renderFormDialog()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!formData.name || !formData.slug || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete SSO Provider</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog?.name}</strong>? Users who signed
            in via this provider will need to use another authentication method. This action cannot
            be undone.
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
