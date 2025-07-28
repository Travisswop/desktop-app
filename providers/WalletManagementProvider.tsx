'use client';

import { FC, PropsWithChildren } from 'react';
import { WalletManagementProvider } from '@lifi/wallet-management';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Create a default MUI theme
const theme = createTheme();

// Create a query client for React Query
const queryClient = new QueryClient();

export const LiFiWalletProvider: FC<PropsWithChildren> = ({ children }) => {
    return (
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
                <WalletManagementProvider>
                    {children}
                </WalletManagementProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}; 