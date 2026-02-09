// ===========================================
// 404 Not Found Page
// ===========================================

import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { SentimentDissatisfied } from '@mui/icons-material';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <SentimentDissatisfied
          sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }}
        />
        <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 700 }}>
          404
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button variant="contained" component={Link} to="/">
          Go Home
        </Button>
      </Box>
    </Container>
  );
}
