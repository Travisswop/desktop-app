# Socket Events Testing Guide

This directory contains comprehensive test suites for all socket events in the Swop chat system.

## 🧪 Test Structure

### Test Categories

1. **Connection Events** (`connection-events.test.ts`)
   - Socket connection/disconnection
   - User registration
   - Connection error handling
   - Reconnection logic

2. **Direct Messaging** (`direct-messaging.test.ts`)
   - Send/receive DM messages
   - Message editing and deletion
   - Message forwarding
   - Conversation management
   - Read receipts

3. **Group Chat** (`group-chat.test.ts`)
   - Group creation and management
   - Channel operations
   - Group messaging
   - Bot integrations
   - Member management

4. **Real-time Features** (`realtime-features.test.ts`)
   - Typing indicators
   - Message reactions
   - Live updates
   - Connection quality

5. **Presence & Status** (`presence-status.test.ts`)
   - Online/offline status
   - Away and idle states
   - Custom status messages
   - Bulk presence operations
   - Unread count management

## 🚀 Running Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend socket server:**
   ```bash
   cd ../swop-app-backend
   npm start
   ```

3. **Set environment variables:**
   ```bash
   export SOCKET_URL=http://localhost:4000
   export SOCKET_AUTH_TOKEN=<jwt-for-a-real-test-user>
   ```

Socket integration specs are skipped by default so local and CI Jest runs do not hang against
an unavailable or unauthenticated backend. Run them explicitly with:

```bash
RUN_SOCKET_INTEGRATION=1 SOCKET_URL=http://localhost:4000 SOCKET_AUTH_TOKEN=<jwt> npm test -- --runInBand
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Connection tests only
npm test connection-events

# Direct messaging tests
npm test direct-messaging

# Group chat tests
npm test group-chat

# Real-time features
npm test realtime-features

# Presence and status tests
npm test presence-status
```

### Watch Mode
```bash
npm run test:watch
```

## 📋 Test Coverage

### Socket Events Tested

#### Connection Events
- `connect` ✅
- `disconnect` ✅
- `connect_error` ✅
- `reconnect` ✅
- `reconnect_attempt` ✅
- `reconnect_error` ✅
- `reconnect_failed` ✅
- `register_user` ✅
- `join_user_room` ✅

#### Direct Messaging Events
- `send_dm` ✅
- `recived_dm` ✅
- `edit_dm` ✅
- `delete_dm` ✅
- `forward_dm` ✅
- `join_dm` ✅
- `leave_dm` ✅
- `get_private_message_history` ✅
- `message_read` ✅

#### Group Chat Events
- `create_group` ✅
- `get_user_groups` ✅
- `join_channel` ✅
- `leave_channel` ✅
- `send_message` ✅
- `receive_message` ✅
- `add_group_member` ✅
- `get_group_members` ✅
- `search_users` ✅
- `get_available_bots` ✅
- `add_bot_to_group` ✅
- `remove_bot_from_group` ✅
- `send_bot_command` ✅

#### Real-time Features
- `typing` ✅
- `stop_typing` ✅
- `add_reaction` ✅
- `remove_reaction` ✅
- `mark_as_read` ✅
- `pin_message` ✅
- `unpin_message` ✅

#### Presence & Status Events
- `user_online` ✅
- `user_offline` ✅
- `user_away` ✅
- `all_users_presence` ✅
- `fetch_unread_counts` ✅
- `unread_counts` ✅

#### Crypto Transaction Events
- `initiate_crypto_transaction` ✅

## 🛠 Test Utilities

The `test-runner.ts` file provides utilities for:

- **SocketTestRunner**: Main test runner class
  - `createSockets(count)`: Create multiple socket connections
  - `registerUsers(sockets, users)`: Register test users
  - `waitForEvent(sockets, eventName)`: Wait for events across sockets
  - `cleanup()`: Clean up connections

- **SocketTestUtils**: Helper utilities
  - `expectEvent(socket, eventName)`: Assert event reception
  - `expectEventSequence(socket, events)`: Test event sequences
  - `validateMessage(message)`: Validate message structure
  - `validatePresence(presence)`: Validate presence data

### Usage Example

```typescript
import SocketTestRunner, { SocketTestUtils } from './test-runner';

describe('My Socket Test', () => {
  let testRunner: SocketTestRunner;
  let sockets: Socket[];

  beforeEach(async () => {
    testRunner = new SocketTestRunner();
    sockets = await testRunner.createSockets(2);
    
    const users = [
      SocketTestRunner.createMockUser('user1'),
      SocketTestRunner.createMockUser('user2')
    ];
    
    await testRunner.registerUsers(sockets, users);
  });

  afterEach(() => {
    testRunner.cleanup();
  });

  test('should send message', async () => {
    const message = SocketTestRunner.createMockMessage('user1', 'user2');
    
    sockets[0].emit('send_dm', message);
    
    const received = await SocketTestUtils.expectEvent(sockets[1], 'recived_dm');
    expect(received.content).toBe(message.content);
  });
});
```

## 🔧 Configuration

### Environment Variables

- `RUN_SOCKET_INTEGRATION`: Set to `1` to enable backend socket integration tests
- `SOCKET_URL`: Socket server URL (default: `http://localhost:4000`)
- `SOCKET_AUTH_TOKEN`: JWT for an existing backend/database user
- `TEST_TIMEOUT`: Test timeout in milliseconds (default: 10000)

### Jest Configuration

Tests are configured with:
- 10 second timeout for socket operations
- Node.js test environment
- WebSocket mocking for reliable testing
- Automatic cleanup after each test

## 📊 Test Reports

### Running with Coverage
```bash
npm test -- --coverage
```

### Generate Test Report
```bash
npm test -- --reporters=default --reporters=jest-html-reporter
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection timeout errors**
   - Ensure socket server is running
   - Check `SOCKET_URL` environment variable
   - Verify firewall settings

2. **Tests failing intermittently**
   - Increase test timeouts in Jest config
   - Add delays between rapid operations
   - Check server resource limits

3. **WebSocket connection issues**
   - Use `websocket` transport only in tests
   - Disable auto-reconnection for predictable tests
   - Mock WebSocket in problematic environments

### Debug Mode

Enable debug logging:
```bash
DEBUG=socket.io:client npm test
```

## 📈 Performance Testing

### Load Testing
```bash
# Test with multiple concurrent connections
npm test -- --testNamePattern="multiple simultaneous connections"
```

### Latency Testing
```bash
# Measure event latency
npm test -- --testNamePattern="latency"
```

## 🔄 Continuous Integration

Add to your CI pipeline:

```yaml
- name: Start Socket Server
  run: |
    cd swop-app-backend
    npm start &
    sleep 5

- name: Run Socket Tests
  run: RUN_SOCKET_INTEGRATION=1 npm test -- --runInBand
  env:
    SOCKET_URL: http://localhost:4000
    SOCKET_AUTH_TOKEN: ${{ secrets.SOCKET_AUTH_TOKEN }}
```

## 📝 Writing New Tests

When adding new socket events:

1. **Add to appropriate test file** based on category
2. **Follow naming convention**: `should [action] [expected result]`
3. **Test both success and error cases**
4. **Include cleanup in afterEach**
5. **Use test utilities for common operations**
6. **Add proper type assertions**
7. **Test edge cases and error conditions**

### Test Template

```typescript
describe('New Socket Event', () => {
  test('should handle new event successfully', (done) => {
    const testData = {
      // Your test data
    };

    receiverSocket.on('expected_response', (response) => {
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      done();
    });

    senderSocket.emit('new_event', testData);
  });

  test('should handle new event errors', (done) => {
    const invalidData = {
      // Invalid test data
    };

    senderSocket.on('new_event_error', (error) => {
      expect(error.type).toBeDefined();
      expect(error.message).toBeDefined();
      done();
    });

    senderSocket.emit('new_event', invalidData);
  });
});
```
