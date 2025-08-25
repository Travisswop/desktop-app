'use client';

import { useSocketChat } from '@/lib/context/SocketChatContext';
import { Card, CardContent, CardHeader } from '../ui/card';

export default function SocketStatus() {
  const { socket, isConnected, loading, error } = useSocketChat();

  const testConnection = () => {
    if (socket) {
      console.log('🔍 Testing socket connection...');
      console.log('🔍 Socket connected:', socket.connected);
      console.log('🔍 Socket ID:', socket.id);
      console.log('🔍 Socket transport:', socket.io.engine.transport.name);
      console.log('🔍 Socket URL:', socket.io.uri);
      
      // Test ping
      socket.emit('ping', { timestamp: Date.now() });
      socket.on('pong', (data) => {
        console.log('🏓 Pong received:', data);
      });
    } else {
      console.log('❌ Socket not available');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h3 className="font-bold text-lg">Socket Connection Status</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : loading ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {loading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="text-sm space-y-1">
          <div>Socket URL: <code className="text-xs bg-gray-100 px-1 rounded">{(process.env.NEXT_PUBLIC_SOCKET || 'http://localhost:9000').replace(/\/$/, '') + '/anthillChat'}</code></div>
          <div>Socket ID: <code className="text-xs bg-gray-100 px-1 rounded">{socket?.id || 'N/A'}</code></div>
          <div>Transport: <code className="text-xs bg-gray-100 px-1 rounded">{socket?.io.engine?.transport?.name || 'N/A'}</code></div>
        </div>

        {error && (
          <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
            <strong>Error:</strong> {error.message}
          </div>
        )}

        <button 
          onClick={testConnection}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Connection
        </button>

        <div className="text-xs text-gray-500">
          Open browser console to see detailed connection logs
        </div>
      </CardContent>
    </Card>
  );
}