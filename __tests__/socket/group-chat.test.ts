import { io, Socket } from 'socket.io-client';

describe('Socket Group Chat Events', () => {
  let adminSocket: Socket;
  let memberSocket1: Socket;
  let memberSocket2: Socket;
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  const mockAdmin = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com'
  };

  const mockMember1 = {
    id: 'member-456',
    name: 'Member One',
    email: 'member1@example.com'
  };

  const mockMember2 = {
    id: 'member-789',
    name: 'Member Two',
    email: 'member2@example.com'
  };

  beforeEach((done) => {
    let connectCount = 0;
    
    const checkConnections = () => {
      connectCount++;
      if (connectCount === 3) {
        // Register all users
        adminSocket.emit('register_user', mockAdmin);
        memberSocket1.emit('register_user', mockMember1);
        memberSocket2.emit('register_user', mockMember2);
        
        setTimeout(() => {
          done();
        }, 500);
      }
    };

    adminSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    memberSocket1 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    memberSocket2 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    adminSocket.on('connect', checkConnections);
    memberSocket1.on('connect', checkConnections);
    memberSocket2.on('connect', checkConnections);

    adminSocket.connect();
    memberSocket1.connect();
    memberSocket2.connect();
  });

  afterEach(() => {
    if (adminSocket.connected) adminSocket.disconnect();
    if (memberSocket1.connected) memberSocket1.disconnect();
    if (memberSocket2.connected) memberSocket2.disconnect();
  });

  describe('Group Creation and Management', () => {
    test('should create a new group', (done) => {
      const groupData = {
        groupName: 'Test Group',
        description: 'A test group for testing',
        createdBy: mockAdmin.id,
        members: [mockMember1.id, mockMember2.id],
        isPrivate: false
      };

      adminSocket.on('group_created', (response) => {
        expect(response.success).toBe(true);
        expect(response.group.name).toBe(groupData.groupName);
        expect(response.group.createdBy).toBe(mockAdmin.id);
        expect(response.group.members).toContain(mockMember1.id);
        expect(response.group.members).toContain(mockMember2.id);
        done();
      });

      adminSocket.emit('create_group', groupData);
    });

    test('should handle group creation errors', (done) => {
      const invalidGroupData = {
        groupName: '', // Empty name should cause error
        createdBy: mockAdmin.id
      };

      adminSocket.on('group_creation_error', (error) => {
        expect(error.message).toBeDefined();
        expect(error.type).toBe('invalid_group_data');
        done();
      });

      adminSocket.emit('create_group', invalidGroupData);
    });

    test('should get user groups', (done) => {
      adminSocket.on('user_groups', (groups) => {
        expect(Array.isArray(groups)).toBe(true);
        done();
      });

      adminSocket.emit('get_user_groups', { userId: mockAdmin.id });
    });

    test('should add members to group', (done) => {
      const groupId = 'test-group-123';
      const newMember = 'new-member-999';

      adminSocket.on('members_added_success', (response) => {
        expect(response.groupId).toBe(groupId);
        expect(response.addedMembers).toContain(newMember);
        expect(response.success).toBe(true);
        done();
      });

      adminSocket.emit('add_group_member', {
        groupId,
        membersToAdd: [newMember],
        addedBy: mockAdmin.id
      });
    });

    test('should get group members', (done) => {
      const groupId = 'test-group-456';

      adminSocket.on('group_members', (response) => {
        expect(response.groupId).toBe(groupId);
        expect(Array.isArray(response.members)).toBe(true);
        done();
      });

      adminSocket.emit('get_group_members', { groupId });
    });
  });

  describe('Channel Management', () => {
    test('should join a channel', (done) => {
      const channelData = {
        channelId: 'channel-123',
        userId: mockMember1.id,
        groupId: 'group-456'
      };

      memberSocket1.on('joined_channel', (response) => {
        expect(response.channelId).toBe(channelData.channelId);
        expect(response.userId).toBe(channelData.userId);
        expect(response.success).toBe(true);
        done();
      });

      memberSocket1.emit('join_channel', channelData);
    });

    test('should leave a channel', (done) => {
      const channelData = {
        channelId: 'channel-123',
        userId: mockMember1.id,
        groupId: 'group-456'
      };

      memberSocket1.on('left_channel', (response) => {
        expect(response.channelId).toBe(channelData.channelId);
        expect(response.userId).toBe(channelData.userId);
        expect(response.success).toBe(true);
        done();
      });

      memberSocket1.emit('leave_channel', channelData);
    });

    test('should get message history for channel', (done) => {
      const historyRequest = {
        channelId: 'channel-789',
        limit: 50,
        offset: 0
      };

      memberSocket1.on('message_history', (response) => {
        expect(response.channelId).toBe(historyRequest.channelId);
        expect(Array.isArray(response.messages)).toBe(true);
        expect(response.messages.length).toBeLessThanOrEqual(historyRequest.limit);
        done();
      });

      memberSocket1.emit('get_message_history', historyRequest);
    });
  });

  describe('Group Messaging', () => {
    test('should send and receive group messages', (done) => {
      const groupMessage = {
        groupId: 'group-123',
        channelId: 'channel-456',
        content: 'Hello everyone in the group!',
        messageType: 'text',
        senderId: mockMember1.id
      };

      let messagesReceived = 0;
      const checkAllReceived = (message: any) => {
        expect(message.content).toBe(groupMessage.content);
        expect(message.senderId).toBe(mockMember1.id);
        messagesReceived++;
        
        if (messagesReceived === 2) { // Admin and member2 should receive
          done();
        }
      };

      adminSocket.on('receive_message', checkAllReceived);
      memberSocket2.on('receive_message', checkAllReceived);

      memberSocket1.emit('send_message', groupMessage);
    });

    test('should handle different message types in groups', (done) => {
      const messages = [
        {
          groupId: 'group-123',
          channelId: 'channel-456',
          content: 'Text message',
          messageType: 'text',
          senderId: mockAdmin.id
        },
        {
          groupId: 'group-123',
          channelId: 'channel-456',
          content: 'https://example.com/image.jpg',
          messageType: 'image',
          senderId: mockAdmin.id
        },
        {
          groupId: 'group-123',
          channelId: 'channel-456',
          content: JSON.stringify({ amount: 100, currency: 'SOL' }),
          messageType: 'crypto_transaction',
          senderId: mockAdmin.id
        }
      ];

      let messagesReceived = 0;
      const expectedMessages = messages.length;

      memberSocket1.on('receive_message', (message) => {
        messagesReceived++;
        expect(messages.some(m => m.content === message.content)).toBe(true);
        
        if (messagesReceived === expectedMessages) {
          done();
        }
      });

      messages.forEach((message, index) => {
        setTimeout(() => {
          adminSocket.emit('send_message', message);
        }, index * 100);
      });
    });

    test('should handle group message with mentions', (done) => {
      const mentionMessage = {
        groupId: 'group-123',
        channelId: 'channel-456',
        content: `Hey @${mockMember1.name}, check this out!`,
        messageType: 'text',
        senderId: mockAdmin.id,
        mentions: [mockMember1.id]
      };

      memberSocket1.on('receive_message', (message) => {
        expect(message.content).toContain(`@${mockMember1.name}`);
        expect(message.mentions).toContain(mockMember1.id);
        done();
      });

      adminSocket.emit('send_message', mentionMessage);
    });
  });

  describe('Bot Integration', () => {
    test('should get available bots for group', (done) => {
      const groupId = 'group-with-bots-123';

      adminSocket.on('available_bots', (response) => {
        expect(response.groupId).toBe(groupId);
        expect(Array.isArray(response.bots)).toBe(true);
        done();
      });

      adminSocket.emit('get_available_bots', { groupId });
    });

    test('should add bot to group', (done) => {
      const botData = {
        groupId: 'group-123',
        botId: 'weather-bot-456',
        addedBy: mockAdmin.id
      };

      adminSocket.on('bot_added_to_group', (response) => {
        expect(response.groupId).toBe(botData.groupId);
        expect(response.botId).toBe(botData.botId);
        expect(response.success).toBe(true);
        done();
      });

      adminSocket.emit('add_bot_to_group', botData);
    });

    test('should remove bot from group', (done) => {
      const botData = {
        groupId: 'group-123',
        botId: 'weather-bot-456',
        removedBy: mockAdmin.id
      };

      adminSocket.on('bot_removed_from_group', (response) => {
        expect(response.groupId).toBe(botData.groupId);
        expect(response.botId).toBe(botData.botId);
        expect(response.success).toBe(true);
        done();
      });

      adminSocket.emit('remove_bot_from_group', botData);
    });

    test('should send bot command', (done) => {
      const botCommand = {
        groupId: 'group-123',
        botId: 'weather-bot-456',
        command: '/weather',
        parameters: { location: 'New York' },
        senderId: mockMember1.id
      };

      memberSocket1.on('bot_response', (response) => {
        expect(response.botId).toBe(botCommand.botId);
        expect(response.command).toBe(botCommand.command);
        expect(response.response).toBeDefined();
        done();
      });

      memberSocket1.emit('send_bot_command', botCommand);
    });

    test('should get bot capabilities', (done) => {
      const botId = 'weather-bot-456';

      adminSocket.on('bot_capabilities', (response) => {
        expect(response.botId).toBe(botId);
        expect(Array.isArray(response.commands)).toBe(true);
        expect(response.description).toBeDefined();
        done();
      });

      adminSocket.emit('get_bot_capabilities', { botId });
    });
  });

  describe('User Search', () => {
    test('should search users for adding to group', (done) => {
      const searchQuery = {
        query: 'test user',
        groupId: 'group-123',
        limit: 10
      };

      adminSocket.on('user_search_results', (results) => {
        expect(Array.isArray(results.users)).toBe(true);
        expect(results.query).toBe(searchQuery.query);
        done();
      });

      adminSocket.emit('search_users', searchQuery);
    });

    test('should handle empty search results', (done) => {
      const searchQuery = {
        query: 'nonexistent-user-xyz-123',
        groupId: 'group-123',
        limit: 10
      };

      adminSocket.on('user_search_results', (results) => {
        expect(results.users.length).toBe(0);
        expect(results.query).toBe(searchQuery.query);
        done();
      });

      adminSocket.emit('search_users', searchQuery);
    });
  });

  describe('Crypto Transactions in Groups', () => {
    test('should initiate crypto transaction in group', (done) => {
      const transactionData = {
        groupId: 'group-123',
        channelId: 'channel-456',
        senderId: mockAdmin.id,
        recipientId: mockMember1.id,
        amount: 0.5,
        currency: 'SOL',
        transactionType: 'send'
      };

      memberSocket1.on('crypto_transaction_initiated', (transaction) => {
        expect(transaction.senderId).toBe(transactionData.senderId);
        expect(transaction.recipientId).toBe(transactionData.recipientId);
        expect(transaction.amount).toBe(transactionData.amount);
        expect(transaction.currency).toBe(transactionData.currency);
        done();
      });

      adminSocket.emit('initiate_crypto_transaction', transactionData);
    });

    test('should handle invalid crypto transaction', (done) => {
      const invalidTransaction = {
        groupId: 'group-123',
        channelId: 'channel-456',
        senderId: mockAdmin.id,
        recipientId: 'invalid-user',
        amount: -1, // Invalid negative amount
        currency: 'SOL'
      };

      adminSocket.on('crypto_transaction_error', (error) => {
        expect(error.type).toBe('invalid_transaction');
        expect(error.message).toBeDefined();
        done();
      });

      adminSocket.emit('initiate_crypto_transaction', invalidTransaction);
    });
  });

  describe('Error Handling', () => {
    test('should handle unauthorized group access', (done) => {
      const unauthorizedAction = {
        groupId: 'private-group-999',
        userId: mockMember1.id,
        action: 'send_message'
      };

      memberSocket1.on('group_access_error', (error) => {
        expect(error.type).toBe('unauthorized_access');
        expect(error.groupId).toBe(unauthorizedAction.groupId);
        done();
      });

      memberSocket1.emit('send_message', {
        groupId: unauthorizedAction.groupId,
        content: 'This should fail',
        senderId: mockMember1.id
      });
    });

    test('should handle invalid group ID', (done) => {
      const invalidGroupData = {
        groupId: 'nonexistent-group-123',
        userId: mockAdmin.id
      };

      adminSocket.on('group_error', (error) => {
        expect(error.type).toBe('group_not_found');
        expect(error.groupId).toBe(invalidGroupData.groupId);
        done();
      });

      adminSocket.emit('get_group_members', invalidGroupData);
    });

    test('should handle network interruption during group operations', (done) => {
      const groupMessage = {
        groupId: 'group-123',
        channelId: 'channel-456',
        content: 'Message during disconnection',
        messageType: 'text',
        senderId: mockAdmin.id
      };

      let messageReceived = false;

      memberSocket1.on('receive_message', () => {
        messageReceived = true;
      });

      // Disconnect member temporarily
      memberSocket1.disconnect();

      setTimeout(() => {
        memberSocket1.connect();
        
        setTimeout(() => {
          adminSocket.emit('send_message', groupMessage);
          
          setTimeout(() => {
            expect(messageReceived).toBe(true);
            done();
          }, 1000);
        }, 500);
      }, 500);
    });
  });
});