// ===========================================
// Account Info Card
// ===========================================

import { Card, CardContent, CardHeader, Divider, Box, Typography } from '@mui/material';

interface AccountInfoCardProps {
  email?: string;
  isAdmin?: boolean;
  createdAt?: string;
}

export function AccountInfoCard({ email, isAdmin, createdAt }: AccountInfoCardProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="Account Information" />
      <Divider />
      <CardContent>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{email}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Role
            </Typography>
            <Typography variant="body1">
              {isAdmin ? 'Administrator' : 'User'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Member Since
            </Typography>
            <Typography variant="body1">
              {createdAt ? new Date(createdAt).toLocaleDateString() : '-'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
