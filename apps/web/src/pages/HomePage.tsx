// ===========================================
// Home Page
// ===========================================

import { Typography, Box, Card, CardContent } from '@mui/material';
import { useAuthStore } from '../stores/auth.store.js';

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        You are logged in.
      </Typography>

      {user && (
        <Card sx={{ maxWidth: 400, mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: {user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Member since: {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

