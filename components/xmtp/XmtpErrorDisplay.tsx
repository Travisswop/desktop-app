'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useXmtpError } from '@/lib/hooks/useXmtpError';

interface XmtpErrorDisplayProps {
    className?: string;
}

export const XmtpErrorDisplay: React.FC<XmtpErrorDisplayProps> = ({ className }) => {
    const { errorInfo, handleRetry, handleClearData } = useXmtpError();
    const [isRetrying, setIsRetrying] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    if (!errorInfo) return null;

    const onRetry = async () => {
        setIsRetrying(true);
        try {
            await handleRetry();
        } finally {
            setIsRetrying(false);
        }
    };

    const onClearData = () => {
        setIsClearing(true);
        handleClearData();
        // The component will unmount after clearing data, so no need to set isClearing to false
    };

    return (
        <Alert className={`border-destructive ${className}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-destructive">
                XMTP Connection Error
            </AlertTitle>
            <AlertDescription className="mt-2">
                <p className="text-sm text-muted-foreground mb-3">
                    {errorInfo.userMessage}
                </p>

                <div className="flex gap-2 flex-wrap">
                    {errorInfo.canRetry && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRetry}
                            disabled={isRetrying}
                            className="h-8"
                        >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                            {isRetrying ? 'Retrying...' : 'Retry'}
                        </Button>
                    )}

                    {errorInfo.canClearData && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={onClearData}
                            disabled={isClearing}
                            className="h-8"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {isClearing ? 'Clearing...' : 'Clear Data'}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.reload()}
                        className="h-8"
                    >
                        Refresh Page
                    </Button>
                </div>

                {errorInfo.type === 'installation_limit' && (
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                        <p><strong>What happened?</strong></p>
                        <p>XMTP limits each wallet to 5 installations. The system automatically tried to clean up old installations, but you may need to manually clear your data or refresh the page.</p>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}; 