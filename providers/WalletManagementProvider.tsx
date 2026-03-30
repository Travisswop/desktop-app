'use client';

import { FC, PropsWithChildren } from 'react';
import { WalletManagementProvider } from '@lifi/wallet-management';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// @lifi/widget uses MUI internally and requires ThemeProvider in context
const theme = createTheme();

export const LiFiWalletProvider: FC<PropsWithChildren> = ({ children }) => {
    return (
        <ThemeProvider theme={theme}>
            <WalletManagementProvider>
                {children}
            </WalletManagementProvider>
        </ThemeProvider>
    );
};