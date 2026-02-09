// ===========================================
// Landing Page
// ===========================================
// Public landing page with hero and features.

import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Speed, Security, Code } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../lib/constants.js';

const features = [
  {
    icon: <Speed sx={{ fontSize: 48 }} />,
    title: 'Fast Development',
    description:
      'Start building immediately with a pre-configured fullstack setup.',
  },
  {
    icon: <Security sx={{ fontSize: 48 }} />,
    title: 'Secure by Default',
    description:
      'Built-in authentication, authorization, and security best practices.',
  },
  {
    icon: <Code sx={{ fontSize: 48 }} />,
    title: 'Modern Stack',
    description:
      'React, Express, TypeScript, and PostgreSQL with the latest tooling.',
  },
];

export function LandingPage() {
  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 700,
              mb: 2,
            }}
          >
            {APP_NAME}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.75rem' },
              fontWeight: 300,
              mb: 4,
              opacity: 0.9,
            }}
          >
            A Modern Fullstack Template
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/register"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/login"
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Sign In
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          Features
        </Typography>
        <Typography
          variant="body1"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
        >
          Everything you need to build production-ready applications.
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                elevation={2}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          py: 8,
          textAlign: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h4" gutterBottom>
            Ready to Start?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create an account and start building today.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/register"
          >
            Create Free Account
          </Button>
        </Container>
      </Box>
    </Box>
  );
}

