# Chat V2 Frontend Migration Guide

## 🎯 Quick Start

### 1. Enable V2 Chat System

Add to your `.env.local`:
```bash
NEXT_PUBLIC_USE_CHAT_V2=true
```

### 2. Updated Components

✅ **ChatContainer.tsx** - Updated with feature flag support

⏳ **ChatArea.tsx** - Needs updating (see instructions below)

⏳ **Other chat components** - Needs updating

## 📝 Already Updated: ChatContainer.tsx

The `ChatContainer.tsx` has been updated with:
- ✅ Feature flag support (`USE_CHAT_V2`)
- ✅ Dynamic event names based on flag
- ✅ V2 event listeners for direct chats
- ✅ Backward compatibility with old system

## 🔧 How to Update ChatArea.tsx

### Step 1: Add Feature Flag at Top

```typescript
// Add after imports
const USE_CHAT_V2 = process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';

// Define socket events
const EVENTS = USE_CHAT_V2 ? {
  JOIN_CONVERSATION: 'join_conversation_v2',
  LEAVE_CONVERSATION: 'leave_conversation_v2',
  SEND_MESSAGE: 'send_message_v2',
  NEW_MESSAGE: 'new_message_v2',
  MARK_MESSAGES_READ: 'mark_messages_read_v2',
  GET_CONVERSATION_HISTORY: 'get_conversation_history_v2',
  TYPING_START: 'typing_start_v2',
  TYPING_STOP: 'typing_stop_v2',
  USER_TYPING: 'user_typing_v2',
  MESSAGE_DELETED: 'message_deleted_v2',
  MESSAGE_EDITED: 'message_edited_v2',
  MESSAGES_READ: 'messages_read_v2',
} : {
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  MARK_MESSAGES_READ: 'mark_messages_read',
  GET_CONVERSATION_HISTORY: 'get_conversation_history',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'typing_started',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_EDITED: 'message_edited',
  MESSAGES_READ: 'messages_read',
};
```

### Step 2: Update socket.emit Calls

**Before:**
```typescript
socket.emit('send_message', messageData);
socket.emit('join_conversation', { receiverId });
socket.emit('mark_messages_read', { senderId });
```

**After:**
```typescript
socket.emit(EVENTS.SEND_MESSAGE, messageData);
socket.emit(EVENTS.JOIN_CONVERSATION, { receiverId });
socket.emit(EVENTS.MARK_MESSAGES_READ, { senderId });
```

### Step 3: Update socket.on Event Listeners

**Before:**
```typescript
socket.on('new_message', handleNewMessage);
socket.on('typing_started', handleTyping);
socket.on('messages_read', handleRead);
```

**After:**
```typescript
socket.on(EVENTS.NEW_MESSAGE, handleNewMessage);
socket.on(EVENTS.USER_TYPING, handleTyping);
socket.on(EVENTS.MESSAGES_READ, handleRead);
```

### Step 4: Update Cleanup in useEffect

**Before:**
```typescript
return () => {
  socket.off('new_message', handleNewMessage);
  socket.off('typing_started', handleTyping);
};
```

**After:**
```typescript
return () => {
  socket.off(EVENTS.NEW_MESSAGE, handleNewMessage);
  socket.off(EVENTS.USER_TYPING, handleTyping);
};
```

## 🔍 Finding All Socket Events to Update

Use this command to find all socket events in a file:
```bash
grep -n "socket\.emit\|socket\.on" components/chat/ChatArea.tsx
```

## 📋 Complete Event Mapping

| Old Event | New V2 Event | Used In |
|-----------|--------------|---------|
| `send_message` | `send_message_v2` | Sending messages |
| `new_message` | `new_message_v2` | Receiving messages |
| `join_conversation` | `join_conversation_v2` | Joining chat |
| `leave_conversation` | `leave_conversation_v2` | Leaving chat |
| `get_conversations` | `get_conversations_v2` | Loading list |
| `get_conversation_history` | `get_conversation_history_v2` | Loading messages |
| `mark_messages_read` | `mark_messages_read_v2` | Read receipts |
| `typing_start` / `typing_started` | `typing_start_v2` | Typing indicator |
| `typing_stop` / `typing_stopped` | `typing_stop_v2` | Stop typing |
| `user_typing` / `typing_started` | `user_typing_v2` | Receiving typing |
| `delete_message` | `delete_message_v2` | Delete message |
| `edit_message` | `edit_message_v2` | Edit message |
| `message_deleted` | `message_deleted_v2` | Receive deletion |
| `message_edited` | `message_edited_v2` | Receive edit |
| `messages_read` | `messages_read_v2` | Receive read |
| `get_unread_count` | `get_unread_count_v2` | Unread count |
| `unread_count_updated` | `unread_count_updated_v2` | Count update |
| `conversation_updated` | `conversation_updated_v2` | Chat update |
| `search_contacts` | `search_contacts_v2` | Search |
| `resolve_contact` | `resolve_contact_v2` | ENS lookup |
| `block_user` | `block_user_v2` | Block |
| `unblock_user` | `unblock_user_v2` | Unblock |

## 🎭 Testing Checklist

### Before Enabling V2
- [ ] All socket events updated in ChatArea.tsx
- [ ] All socket events updated in MessageInput component (if separate)
- [ ] All socket events updated in Sidebar.tsx
- [ ] Feature flag added to .env.local
- [ ] Backend V2 handlers confirmed running

### After Enabling V2
- [ ] Messages send successfully
- [ ] Messages appear in real-time
- [ ] Conversation list loads
- [ ] Unread counts update
- [ ] Typing indicators work
- [ ] Message editing works
- [ ] Message deletion works
- [ ] No console errors

## 🐛 Troubleshooting

### Messages not sending
```typescript
// Check if using V2 events
console.log('Using V2:', USE_CHAT_V2);
console.log('Event name:', EVENTS.SEND_MESSAGE);

// Should log: 'send_message_v2' if V2 is enabled
```

### Not receiving messages
```typescript
// Verify event listener is registered
socket.on(EVENTS.NEW_MESSAGE, (data) => {
  console.log('Received message (V2:', USE_CHAT_V2, '):', data);
});
```

### Feature flag not working
```bash
# Restart Next.js dev server after changing .env.local
npm run dev
```

## 📂 Files That Need Updates

### High Priority (Direct Chat)
- ✅ `components/chat/ChatContainer.tsx` - **DONE**
- ⏳ `components/chat/ChatArea.tsx` - Needs update
- ⏳ `components/chat/Sidebar.tsx` - Check if has socket events
- ⏳ Any message input components

### Low Priority (if exists)
- ⏳ Message list components
- ⏳ Contact search components
- ⏳ Any standalone chat utilities

## 🔄 Gradual Rollout Strategy

### Option 1: Environment-Based
```bash
# Development
NEXT_PUBLIC_USE_CHAT_V2=true

# Production (after testing)
NEXT_PUBLIC_USE_CHAT_V2=true
```

### Option 2: User-Based (requires code change)
```typescript
// In ChatContainer or App level
const BETA_USERS = ['user_id_1', 'user_id_2'];
const USE_CHAT_V2 = BETA_USERS.includes(currentUser._id) ||
                    process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';
```

### Option 3: Percentage Rollout (requires code change)
```typescript
function shouldUseV2(userId: string) {
  const hash = userId.split('').reduce((a, b) => {
    return ((a << 5) - a) + b.charCodeAt(0);
  }, 0);
  return Math.abs(hash % 100) < 10; // 10% of users
}

const USE_CHAT_V2 = shouldUseV2(currentUser._id) ||
                    process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';
```

## ✅ Verification Steps

1. **Check Feature Flag**
   ```typescript
   console.log('USE_CHAT_V2:', USE_CHAT_V2);
   ```

2. **Check Event Names**
   ```typescript
   console.log('EVENTS:', EVENTS);
   ```

3. **Monitor Network**
   - Open browser DevTools > Network > WS
   - Watch for V2 event names in socket messages

4. **Check Backend Logs**
   - Backend should log `[Chat V2]` for V2 events
   - Backend should log regular logs for old events

## 🎉 Success Indicators

When migration is complete, you should see:
- ✅ `[Chat V2]` logs in backend console
- ✅ `Using Chat V2: true` in browser console
- ✅ V2 event names in network tab
- ✅ Faster query times (67% improvement)
- ✅ All chat features working

## 📚 Additional Resources

- Backend V2 Guide: `swop-app-backend/CHAT_V2_MIGRATION_GUIDE.md`
- Architecture Docs: `swop-app-backend/NEW_MESSAGE_ARCHITECTURE.md`
- Service Code: `swop-app-backend/src/services/chatServiceV2.js`
- Socket Handlers: `swop-app-backend/src/socket/chatHandlersV2.js`

---

**Current Status**:
- ✅ Backend V2 Ready
- ✅ ChatContainer.tsx Updated
- ⏳ ChatArea.tsx Needs Update
- ⏳ Other components need review

**Next Steps**:
1. Update ChatArea.tsx with EVENTS constants
2. Test with `NEXT_PUBLIC_USE_CHAT_V2=true`
3. Gradually enable for all users
4. Monitor performance improvements
