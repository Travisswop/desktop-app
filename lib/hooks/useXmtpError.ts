'use client';

import { useCallback } from 'react';
import { useXmtpContext } from '@/lib/context/XmtpContext';

export interface XmtpErrorInfo {
    type: 'installation_limit' | 'network_error' | 'initialization_error' | 'unknown';
    message: string;
    userMessage: string;
    canRetry: boolean;
    canClearData: boolean;
}

export const useXmtpError = () => {
    const { error, clearClientData, refreshConversations } = useXmtpContext();

    const getErrorInfo = useCallback((error: Error | null): XmtpErrorInfo | null => {
        if (!error) return null;

        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('has already registered 5/5 installations')) {
            return {
                type: 'installation_limit',
                message: error.message,
                userMessage: 'You have reached the maximum number of XMTP installations. The system attempted to clean up old installations automatically. Please try refreshing the page or clearing your client data.',
                canRetry: true,
                canClearData: true,
            };
        }

        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            return {
                type: 'network_error',
                message: error.message,
                userMessage: 'Network connection error. Please check your internet connection and try again.',
                canRetry: true,
                canClearData: false,
            };
        }

        if (errorMessage.includes('failed to initialize') || errorMessage.includes('initialization')) {
            return {
                type: 'initialization_error',
                message: error.message,
                userMessage: 'Failed to initialize XMTP client. This might be a temporary issue.',
                canRetry: true,
                canClearData: true,
            };
        }

        return {
            type: 'unknown',
            message: error.message,
            userMessage: 'An unexpected error occurred while connecting to XMTP. Please try again.',
            canRetry: true,
            canClearData: true,
        };
    }, []);

    const handleRetry = useCallback(async () => {
        try {
            await refreshConversations();
            console.log('✅ [XmtpError] Retry successful');
            return true;
        } catch (error) {
            console.error('❌ [XmtpError] Retry failed:', error);
            return false;
        }
    }, [refreshConversations]);

    const handleClearData = useCallback(() => {
        clearClientData();
        console.log('🧹 [XmtpError] Client data cleared by user');
        // Optionally, you could also reload the page here
        // window.location.reload();
    }, [clearClientData]);

    return {
        error,
        errorInfo: getErrorInfo(error),
        handleRetry,
        handleClearData,
    };
}; 