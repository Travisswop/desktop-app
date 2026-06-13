import { io, Socket } from 'socket.io-client';

describe('Socket Real-time Features', () => {
  let userSocket1: Socket;
  let userSocket2: Socket;
  let userSocket3: Socket;
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  const mockUser1 = {
    id: 'user1-123',
    name: 'User One',
    email: 'user1@example.com'
  };

  const mockUser2 = {
    id: 'user2-456',
    name: 'User Two',
    email: 'user2@example.com'
  };

  const mockUser3 = {
    id: 'user3-789',
    name: 'User Three',
    email: 'user3@example.com'
  };

  beforeEach((done) => {
    let connectCount = 0;
    
    const checkConnections = () => {
      connectCount++;
      if (connectCount === 3) {
        // Register all users
        userSocket1.emit('register_user', mockUser1);
        userSocket2.emit('register_user', mockUser2);
        userSocket3.emit('register_user', mockUser3);
        
        setTimeout(() => {
          done();
        }, 500);
      }
    };

    userSocket1 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    userSocket2 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    userSocket3 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    userSocket1.on('connect', checkConnections);
    userSocket2.on('connect', checkConnections);
    userSocket3.on('connect', checkConnections);

    userSocket1.connect();
    userSocket2.connect();
    userSocket3.connect();
  });

  afterEach(() => {
    if (userSocket1.connected) userSocket1.disconnect();
    if (userSocket2.connected) userSocket2.disconnect();
    if (userSocket3.connected) userSocket3.disconnect();
  });

  describe('Typing Indicators', () => {
    test('should send and receive typing indicators', (done) => {
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;

      userSocket2.on('typing', (data) => {
        expect(data.userId).toBe(mockUser1.id);
        expect(data.conversationId).toBe(conversationId);
        expect(data.isTyping).toBe(true);
        done();
      });

      userSocket1.emit('typing', {
        userId: mockUser1.id,
        conversationId,
        recipientId: mockUser2.id,
        isTyping: true
      });
    });

    test('should send and receive stop typing indicators', (done) => {
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;

      userSocket2.on('stop_typing', (data) => {
        expect(data.userId).toBe(mockUser1.id);
        expect(data.conversationId).toBe(conversationId);
        done();
      });

      // First start typing
      userSocket1.emit('typing', {
        userId: mockUser1.id,
        conversationId,
        recipientId: mockUser2.id,
        isTyping: true
      });

      setTimeout(() => {
        userSocket1.emit('stop_typing', {
          userId: mockUser1.id,
          conversationId,
          recipientId: mockUser2.id
        });
      }, 100);
    });

    test('should handle typing indicators in group chats', (done) => {
      const groupId = 'group-123';
      let typingReceived = 0;

      const checkTypingReceived = (data: any) => {
        expect(data.userId).toBe(mockUser1.id);
        expect(data.groupId).toBe(groupId);
        expect(data.isTyping).toBe(true);
        typingReceived++;
        
        if (typingReceived === 2) {
          done();
        }
      };

      userSocket2.on('user_typing_in_group', checkTypingReceived);
      userSocket3.on('user_typing_in_group', checkTypingReceived);

      userSocket1.emit('typing_in_group', {
        userId: mockUser1.id,
        groupId,
        channelId: 'channel-456',
        isTyping: true
      });
    });

    test('should handle typing timeout automatically', (done) => {
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;
      let stopTypingReceived = false;

      userSocket2.on('stop_typing', (data) => {
        expect(data.userId).toBe(mockUser1.id);
        stopTypingReceived = true;
        done();
      });

      // Start typing but don't explicitly stop
      userSocket1.emit('typing', {
        userId: mockUser1.id,
        conversationId,
        recipientId: mockUser2.id,
        isTyping: true
      });

      // Should automatically stop after timeout (usually 3-5 seconds)
      setTimeout(() => {
        if (!stopTypingReceived) {
          done(new Error('Typing indicator did not timeout automatically'));
        }
      }, 6000);
    });
  });

  describe('Message Reactions', () => {
    test('should add reaction to message', (done) => {
      const reactionData = {
        messageId: 'msg-123',
        conversationId: `dm_${mockUser1.id}_${mockUser2.id}`,
        emoji: '👍',
        userId: mockUser1.id
      };

      userSocket2.on('reaction_added', (reaction) => {
        expect(reaction.messageId).toBe(reactionData.messageId);
        expect(reaction.emoji).toBe(reactionData.emoji);
        expect(reaction.userId).toBe(reactionData.userId);
        expect(reaction.action).toBe('add');
        done();
      });

      userSocket1.emit('add_reaction', reactionData);
    });

    test('should remove reaction from message', (done) => {
      const reactionData = {
        messageId: 'msg-123',
        conversationId: `dm_${mockUser1.id}_${mockUser2.id}`,
        emoji: '👍',
        userId: mockUser1.id
      };

      userSocket2.on('reaction_removed', (reaction) => {
        expect(reaction.messageId).toBe(reactionData.messageId);
        expect(reaction.emoji).toBe(reactionData.emoji);
        expect(reaction.userId).toBe(reactionData.userId);
        expect(reaction.action).toBe('remove');
        done();
      });

      userSocket1.emit('remove_reaction', reactionData);
    });

    test('should handle multiple reactions on same message', (done) => {
      const messageId = 'msg-multi-reactions-456';
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;
      
      let reactionsReceived = 0;
      const expectedReactions = 3;

      userSocket2.on('reaction_added', (reaction) => {
        expect(reaction.messageId).toBe(messageId);
        reactionsReceived++;
        
        if (reactionsReceived === expectedReactions) {
          done();
        }
      });

      // Add multiple reactions
      const reactions = ['👍', '❤️', '😂'];
      reactions.forEach((emoji, index) => {
        setTimeout(() => {
          const userId = [mockUser1.id, mockUser3.id, mockUser1.id][index];
          const socket = [userSocket1, userSocket3, userSocket1][index];
          
          socket.emit('add_reaction', {
            messageId,
            conversationId,
            emoji,
            userId
          });
        }, index * 100);
      });
    });

    test('should handle reactions in group messages', (done) => {
      const reactionData = {
        messageId: 'group-msg-789',
        groupId: 'group-123',
        channelId: 'channel-456',
        emoji: '🎉',
        userId: mockUser1.id
      };

      let reactionsReceived = 0;

      const checkReaction = (reaction: any) => {
        expect(reaction.messageId).toBe(reactionData.messageId);
        expect(reaction.emoji).toBe(reactionData.emoji);
        reactionsReceived++;
        
        if (reactionsReceived === 2) {
          done();
        }
      };

      userSocket2.on('group_reaction_added', checkReaction);
      userSocket3.on('group_reaction_added', checkReaction);

      userSocket1.emit('add_group_reaction', reactionData);
    });
  });

  describe('Presence Status', () => {
    test('should update user online status', (done) => {
      userSocket2.on('user_status_changed', (status) => {
        expect(status.userId).toBe(mockUser1.id);
        expect(status.status).toBe('online');
        expect(status.lastSeen).toBeDefined();
        done();
      });

      userSocket1.emit('user_online', {
        userId: mockUser1.id,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    });

    test('should handle user going offline', (done) => {
      userSocket2.on('user_status_changed', (status) => {
        expect(status.userId).toBe(mockUser1.id);
        expect(status.status).toBe('offline');
        done();
      });

      // Simulate going offline
      userSocket1.emit('user_offline', {
        userId: mockUser1.id,
        status: 'offline',
        lastSeen: new Date().toISOString()
      });
    });

    test('should get all users presence status', (done) => {
      userSocket1.on('all_users_presence', (presenceStatuses) => {
        expect(Array.isArray(presenceStatuses)).toBe(true);
        expect(presenceStatuses.length).toBeGreaterThan(0);
        
        const userStatus = presenceStatuses.find(s => s.userId === mockUser2.id);
        expect(userStatus).toBeDefined();
        expect(['online', 'offline', 'away'].includes(userStatus.status)).toBe(true);
        done();
      });

      userSocket1.emit('get_all_presence');
    });

    test('should handle away status', (done) => {
      userSocket2.on('user_status_changed', (status) => {
        expect(status.userId).toBe(mockUser1.id);
        expect(status.status).toBe('away');
        done();
      });

      userSocket1.emit('user_away', {
        userId: mockUser1.id,
        status: 'away',
        lastSeen: new Date().toISOString()
      });
    });

    test('should handle custom status messages', (done) => {
      const customStatus = {
        userId: mockUser1.id,
        status: 'online',
        customMessage: 'Working on a project 🚀',
        lastSeen: new Date().toISOString()
      };

      userSocket2.on('user_status_changed', (status) => {
        expect(status.userId).toBe(customStatus.userId);
        expect(status.customMessage).toBe(customStatus.customMessage);
        done();
      });

      userSocket1.emit('update_custom_status', customStatus);
    });
  });

  describe('Read Receipts', () => {
    test('should mark message as read', (done) => {
      const readData = {
        messageId: 'msg-read-123',
        conversationId: `dm_${mockUser2.id}_${mockUser1.id}`,
        userId: mockUser1.id,
        readAt: new Date().toISOString()
      };

      userSocket2.on('message_read_receipt', (receipt) => {
        expect(receipt.messageId).toBe(readData.messageId);
        expect(receipt.readBy).toBe(readData.userId);
        expect(receipt.readAt).toBeDefined();
        done();
      });

      userSocket1.emit('mark_as_read', readData);
    });

    test('should handle multiple read receipts', (done) => {
      const messageId = 'group-msg-read-456';
      let receiptsReceived = 0;

      userSocket1.on('message_read_receipt', (receipt) => {
        expect(receipt.messageId).toBe(messageId);
        receiptsReceived++;
        
        if (receiptsReceived === 2) {
          done();
        }
      });

      // Multiple users read the same message
      setTimeout(() => {
        userSocket2.emit('mark_as_read', {
          messageId,
          groupId: 'group-123',
          userId: mockUser2.id,
          readAt: new Date().toISOString()
        });
      }, 100);

      setTimeout(() => {
        userSocket3.emit('mark_as_read', {
          messageId,
          groupId: 'group-123',
          userId: mockUser3.id,
          readAt: new Date().toISOString()
        });
      }, 200);
    });

    test('should get unread message counts', (done) => {
      userSocket1.on('unread_counts', (data) => {
        expect(data.userId).toBe(mockUser1.id);
        expect(typeof data.totalUnread).toBe('number');
        expect(Array.isArray(data.conversationCounts)).toBe(true);
        done();
      });

      userSocket1.emit('fetch_unread_counts', { userId: mockUser1.id });
    });
  });

  describe('Live Updates', () => {
    test('should receive live conversation list updates', (done) => {
      userSocket1.on('conversation_list', (conversations) => {
        expect(Array.isArray(conversations)).toBe(true);
        done();
      });

      userSocket1.emit('get_conversation_list', { userId: mockUser1.id });
    });

    test('should receive live message updates', (done) => {
      const testMessage = {
        conversationId: `dm_${mockUser1.id}_${mockUser2.id}`,
        content: 'Live update test message',
        messageType: 'text',
        senderId: mockUser1.id,
        timestamp: new Date().toISOString()
      };

      userSocket2.on('live_message_update', (message) => {
        expect(message.content).toBe(testMessage.content);
        expect(message.senderId).toBe(testMessage.senderId);
        done();
      });

      userSocket1.emit('send_live_message', testMessage);
    });

    test('should handle connection quality indicators', (done) => {
      userSocket1.on('connection_quality', (quality) => {
        expect(['excellent', 'good', 'poor'].includes(quality.status)).toBe(true);
        expect(typeof quality.latency).toBe('number');
        done();
      });

      userSocket1.emit('check_connection_quality');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle rapid typing events', (done) => {
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;
      let typingEvents = 0;

      userSocket2.on('typing', () => {
        typingEvents++;
      });

      // Send rapid typing events
      for (let i = 0; i < 10; i++) {
        userSocket1.emit('typing', {
          userId: mockUser1.id,
          conversationId,
          recipientId: mockUser2.id,
          isTyping: true
        });
      }

      setTimeout(() => {
        expect(typingEvents).toBeLessThan(10); // Should be throttled
        done();
      }, 1000);
    });

    test('should handle invalid reaction emoji', (done) => {
      const reactionData = {
        messageId: 'msg-123',
        conversationId: `dm_${mockUser1.id}_${mockUser2.id}`,
        emoji: 'invalid-emoji',
        userId: mockUser1.id
      };

      userSocket1.on('reaction_error', (error) => {
        expect(error.type).toBe('invalid_emoji');
        done();
      });

      userSocket1.emit('add_reaction', reactionData);
    });

    test('should handle presence updates for disconnected users', (done) => {
      const disconnectedUserId = 'disconnected-user-999';

      userSocket1.on('presence_error', (error) => {
        expect(error.type).toBe('user_not_found');
        expect(error.userId).toBe(disconnectedUserId);
        done();
      });

      userSocket1.emit('get_user_presence', { userId: disconnectedUserId });
    });

    test('should maintain realtime features during network fluctuations', (done) => {
      const conversationId = `dm_${mockUser1.id}_${mockUser2.id}`;
      let messagesReceived = 0;

      userSocket2.on('recived_dm', () => {
        messagesReceived++;
        if (messagesReceived === 2) {
          done();
        }
      });

      // Send message, disconnect, reconnect, send another
      userSocket1.emit('send_dm', {
        conversationId,
        recipientId: mockUser2.id,
        content: 'First message',
        messageType: 'text'
      });

      setTimeout(() => {
        userSocket1.disconnect();
        
        setTimeout(() => {
          userSocket1.connect();
          
          setTimeout(() => {
            userSocket1.emit('send_dm', {
              conversationId,
              recipientId: mockUser2.id,
              content: 'Second message after reconnect',
              messageType: 'text'
            });
          }, 500);
        }, 200);
      }, 500);
    });
  });
});