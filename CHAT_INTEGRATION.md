# Chat Integration Documentation

## Overview
The chat system has been updated to integrate with the new backend Socket.IO chat server. This document outlines the changes made and how to use the new system.

## Key Changes

### 1. New Chat Service (`lib/api/chatService.ts`)
- RESTful API client for chat operations
- Handles authentication with JWT tokens
- Supports all chat features: messaging, conversations, blocking, etc.

### 2. New Socket Context (`lib/context/NewSocketChatContext.tsx`)
- Real-time Socket.IO integration with JWT authentication
- Manages connection state and chat data
- Handles real-time message delivery and status updates
- Matches socket event patterns from backend HTML test file

### 3. Updated Chat Components
- `NewChatBox` component for improved messaging UI
- Better message grouping and status indicators
- Support for message editing and deletion

### 4. Updated Chat Page (`app/(pages)/chat/page.tsx`)
- Uses the new socket context and components
- Improved conversation handling with backend structure
- Better search and filtering based on new data model

## Environment Variables
Add these to your `.env` file:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_CHAT_API_URL=http://localhost:5000
```

## Backend Integration Points

### Authentication
- Uses JWT tokens stored in localStorage for both Socket.IO and REST API authentication
- Socket connection requires `token` in auth object (not user ID)
- Token sources: `authToken`, `jwt_token`, or `accessToken` from localStorage

### Socket Events
The client handles these socket events:
- `new_message` - New message received (wrapped in `data.message`)
- `messages_read` - Messages marked as read
- `message_deleted` - Message deleted  
- `message_edited` - Message edited (wrapped in `data.message`)
- `conversation_updated` - Conversation list needs refresh
- `typing_started` / `typing_stopped` - Typing indicators

### Socket Methods (with callbacks)
The client emits these events:
- `send_message` - Send a new message
- `get_conversation_history` - Load conversation messages
- `get_conversations` - Load user's conversations
- `join_conversation` - Join a conversation room
- `mark_messages_read` - Mark messages as read
- `search_contacts` - Search for contacts

### API Endpoints
The client uses these REST endpoints:
- `POST /api/v1/chat/messages` - Send message
- `GET /api/v1/chat/conversation/:receiverId` - Get conversation history
- `GET /api/v1/chat/conversations` - Get user's conversations
- `PATCH /api/v1/chat/messages/read/:senderId` - Mark messages as read
- `DELETE /api/v1/chat/messages/:messageId` - Delete message
- `PATCH /api/v1/chat/messages/:messageId` - Edit message

## Data Models

### ChatMessage
```typescript
interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  };
  receiver: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  };
  message: string;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Conversation
```typescript
interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  }>;
  conversationType: 'direct' | 'group' | 'agent';
  lastMessage?: ChatMessage;
  lastActivity: Date;
  isActive: boolean;
  isBlocked: boolean;
  unreadCount: number;
}
```

## Usage

### Starting a Chat
```typescript
const { sendMessage } = useNewSocketChat();
await sendMessage(receiverId, "Hello!", "text");
```

### Loading Conversation History
```typescript
const { getConversation } = useNewSocketChat();
const result = await getConversation(receiverId, 1, 50);
```

### Search Contacts
```typescript
const { searchContacts } = useNewSocketChat();
const result = await searchContacts("username", 10);
```

## Testing the Integration

### Prerequisites
1. Ensure you have a valid JWT token stored in localStorage
2. The token should be stored as `authToken`, `jwt_token`, or `accessToken`
3. Start the backend chat server on port 5000

### Testing Steps
1. Start the Next.js dev server: `npm run dev`
2. Log in to get a valid JWT token (check localStorage in browser dev tools)
3. Navigate to `/chat` page
4. Check browser console for connection status logs
5. Test real-time messaging between two browser windows
6. Verify conversation persistence and message status updates

### Debugging
- Check browser console for detailed connection and authentication logs
- Verify JWT token exists in localStorage before connecting
- Use the backend's HTML test file to verify server functionality
- Check network tab for WebSocket connection attempts

## Migration Notes

- Old XMTP chat implementation has been replaced
- Socket connection is established automatically when user is logged in
- Conversations are created automatically when first message is sent
- All message history is stored on the backend database