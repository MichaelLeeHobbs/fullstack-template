// ===========================================
// useNotification Hook
// ===========================================
// Wrapper around notistack for easy toast notifications.

import { useSnackbar, type VariantType } from 'notistack';

export function useNotification() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  return {
    success: (message: string) =>
      enqueueSnackbar(message, { variant: 'success' }),

    error: (message: string) =>
      enqueueSnackbar(message, { variant: 'error' }),

    warning: (message: string) =>
      enqueueSnackbar(message, { variant: 'warning' }),

    info: (message: string) =>
      enqueueSnackbar(message, { variant: 'info' }),

    notify: (message: string, variant: VariantType = 'default') =>
      enqueueSnackbar(message, { variant }),

    close: closeSnackbar,
  };
}
