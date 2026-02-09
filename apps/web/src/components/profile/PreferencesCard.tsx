// ===========================================
// Preferences Card
// ===========================================

import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material';

interface PreferencesCardProps {
  currentTheme: string;
  isPending: boolean;
  onThemeChange: (event: React.MouseEvent<HTMLElement>, value: 'light' | 'dark' | 'system' | null) => void;
}

export function PreferencesCard({ currentTheme, isPending, onThemeChange }: PreferencesCardProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="Preferences" />
      <Divider />
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Theme
        </Typography>
        <ToggleButtonGroup
          value={currentTheme}
          exclusive
          onChange={onThemeChange}
          disabled={isPending}
        >
          <ToggleButton value="light">
            <LightMode sx={{ mr: 1 }} /> Light
          </ToggleButton>
          <ToggleButton value="dark">
            <DarkMode sx={{ mr: 1 }} /> Dark
          </ToggleButton>
          <ToggleButton value="system">
            <SettingsBrightness sx={{ mr: 1 }} /> System
          </ToggleButton>
        </ToggleButtonGroup>
      </CardContent>
    </Card>
  );
}
