import { io, Socket } from 'socket.io-client';

describe('Socket Direct Messaging Events', () => {
  let senderSocket: Socket;
  let receiverSocket: Socket;
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  const mockSender = {
    id: 'sender-123',
    name: 'Sender User',
    email: 'sender@example.com'
  };

  const mockReceiver = {
    id: 'receiver-456',
    name: 'Receiver User',
    email: 'receiver@example.com'
  };

  beforeEach((done) => {
    let connectCount = 0;
    
    const checkConnections = () => {
      connectCount++;
      if (connectCount === 2) {
        // Register both users
        senderSocket.emit('register_user', mockSender);
        receiverSocket.emit('register_user', mockReceiver);
        
        setTimeout(() => {
          done();
        }, 500);
      }
    };

    senderSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    receiverSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    senderSocket.on('connect', checkConnections);
    receiverSocket.on('connect', checkConnections);

    senderSocket.connect();
    receiverSocket.connect();
  });

  afterEach(() => {
    if (senderSocket.connected) senderSocket.disconnect();
    if (receiverSocket.connected) receiverSocket.disconnect();
  });

  describe('Send Direct Messages', () => {
    test('should send and receive direct messages', (done) => {
      const testMessage = {
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        recipientId: mockReceiver.id,
        content: 'Hello, this is a test message!',
        messageType: 'text',
        timestamp: new Date().toISOString()
      };

      receiverSocket.on('recived_dm', (message) => {
        expect(message.content).toBe(testMessage.content);
        expect(message.senderId).toBe(mockSender.id);
        expect(message.recipientId).toBe(mockReceiver.id);
        expect(message.messageType).toBe('text');
        done();
      });

      senderSocket.emit('send_dm', testMessage);
    });

    test('should handle different message types', (done) => {
      let messagesReceived = 0;
      const expectedMessages = 3;

      const messages = [
        {
          conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
          recipientId: mockReceiver.id,
          content: 'Text message',
          messageType: 'text'
        },
        {
          conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
          recipientId: mockReceiver.id,
          content: 'https://example.com/image.jpg',
          messageType: 'image'
        },
        {
          conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
          recipientId: mockReceiver.id,
          content: 'https://example.com/file.pdf',
          messageType: 'file'
        }
      ];

      receiverSocket.on('recived_dm', (message) => {
        messagesReceived++;
        expect(messages.some(m => m.content === message.content)).toBe(true);
        
        if (messagesReceived === expectedMessages) {
          done();
        }
      });

      messages.forEach((message, index) => {
        setTimeout(() => {
          senderSocket.emit('send_dm', message);
        }, index * 100);
      });
    });

    test('should handle emoji and special characters', (done) => {
      const testMessage = {
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        recipientId: mockReceiver.id,
        content: '🎉 Hello! This has émojis and speciål châracters 中文 العربية',
        messageType: 'text'
      };

      receiverSocket.on('recived_dm', (message) => {
        expect(message.content).toBe(testMessage.content);
        done();
      });

      senderSocket.emit('send_dm', testMessage);
    });
  });

  describe('Message Management', () => {
    test('should edit direct messages', (done) => {
      const originalMessage = {
        messageId: 'msg-123',
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        content: 'Original content'
      };

      const editedMessage = {
        messageId: 'msg-123',
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        content: 'Edited content'
      };

      receiverSocket.on('message_edited', (message) => {
        expect(message.messageId).toBe(originalMessage.messageId);
        expect(message.content).toBe(editedMessage.content);
        expect(message.edited).toBe(true);
        done();
      });

      // First send original message, then edit it
      setTimeout(() => {
        senderSocket.emit('edit_dm', editedMessage);
      }, 100);

      senderSocket.emit('send_dm', originalMessage);
    });

    test('should delete direct messages', (done) => {
      const messageToDelete = {
        messageId: 'msg-delete-123',
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        content: 'This message will be deleted'
      };

      receiverSocket.on('message_deleted', (response) => {
        expect(response.messageId).toBe(messageToDelete.messageId);
        expect(response.success).toBe(true);
        done();
      });

      setTimeout(() => {
        senderSocket.emit('delete_dm', {
          messageId: messageToDelete.messageId,
          conversationId: messageToDelete.conversationId
        });
      }, 100);

      senderSocket.emit('send_dm', messageToDelete);
    });

    test('should forward direct messages', (done) => {
      const thirdUser = {
        id: 'third-user-789',
        name: 'Third User'
      };

      const forwardMessage = {
        messageId: 'msg-forward-123',
        originalSenderId: mockSender.id,
        forwardToUserId: thirdUser.id,
        content: 'This message is being forwarded',
        conversationId: `dm_${mockSender.id}_${thirdUser.id}`
      };

      senderSocket.on('message_forwarded', (response) => {
        expect(response.success).toBe(true);
        expect(response.originalSenderId).toBe(mockSender.id);
        expect(response.forwardedTo).toBe(thirdUser.id);
        done();
      });

      senderSocket.emit('forward_dm', forwardMessage);
    });
  });

  describe('Conversation Management', () => {
    test('should join DM conversation', (done) => {
      const conversationId = `dm_${mockSender.id}_${mockReceiver.id}`;

      senderSocket.on('joined_dm', (response) => {
        expect(response.conversationId).toBe(conversationId);
        expect(response.success).toBe(true);
        done();
      });

      senderSocket.emit('join_dm', {
        conversationId,
        userId: mockSender.id,
        participantId: mockReceiver.id
      });
    });

    test('should leave DM conversation', (done) => {
      const conversationId = `dm_${mockSender.id}_${mockReceiver.id}`;

      senderSocket.on('left_dm', (response) => {
        expect(response.conversationId).toBe(conversationId);
        expect(response.success).toBe(true);
        done();
      });

      senderSocket.emit('leave_dm', { conversationId });
    });

    test('should get private message history', (done) => {
      const conversationId = `dm_${mockSender.id}_${mockReceiver.id}`;

      senderSocket.on('private_message_history', (history) => {
        expect(Array.isArray(history.messages)).toBe(true);
        expect(history.conversationId).toBe(conversationId);
        done();
      });

      senderSocket.emit('get_private_message_history', {
        conversationId,
        userId: mockSender.id,
        participantId: mockReceiver.id,
        limit: 50
      });
    });

    test('should mark messages as read', (done) => {
      const conversationId = `dm_${mockSender.id}_${mockReceiver.id}`;

      receiverSocket.on('messages_marked_read', (response) => {
        expect(response.conversationId).toBe(conversationId);
        expect(response.userId).toBe(mockReceiver.id);
        expect(response.success).toBe(true);
        done();
      });

      receiverSocket.emit('message_read', {
        userId: mockReceiver.id,
        conversationId
      });
    });
  });

  describe('Message Search and Filter', () => {
    test('should search messages in conversation', (done) => {
      const searchQuery = {
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        query: 'test search',
        limit: 10
      };

      senderSocket.on('message_search_results', (results) => {
        expect(Array.isArray(results.messages)).toBe(true);
        expect(results.query).toBe(searchQuery.query);
        expect(results.conversationId).toBe(searchQuery.conversationId);
        done();
      });

      senderSocket.emit('search_messages', searchQuery);
    });

    test('should pin messages', (done) => {
      const pinMessage = {
        messageId: 'msg-pin-123',
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        pin: true
      };

      senderSocket.on('message_pinned', (response) => {
        expect(response.messageId).toBe(pinMessage.messageId);
        expect(response.pinned).toBe(true);
        expect(response.success).toBe(true);
        done();
      });

      senderSocket.emit('pin_message', pinMessage);
    });

    test('should unpin messages', (done) => {
      const unpinMessage = {
        messageId: 'msg-unpin-123',
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`
      };

      senderSocket.on('message_unpinned', (response) => {
        expect(response.messageId).toBe(unpinMessage.messageId);
        expect(response.pinned).toBe(false);
        expect(response.success).toBe(true);
        done();
      });

      senderSocket.emit('unpin_message', unpinMessage);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid recipient ID', (done) => {
      const invalidMessage = {
        conversationId: `dm_${mockSender.id}_invalid`,
        recipientId: 'invalid-user-id',
        content: 'This should fail',
        messageType: 'text'
      };

      senderSocket.on('dm_error', (error) => {
        expect(error.type).toBe('invalid_recipient');
        expect(error.message).toBeDefined();
        done();
      });

      senderSocket.emit('send_dm', invalidMessage);
    });

    test('should handle empty message content', (done) => {
      const emptyMessage = {
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        recipientId: mockReceiver.id,
        content: '',
        messageType: 'text'
      };

      senderSocket.on('dm_error', (error) => {
        expect(error.type).toBe('empty_content');
        done();
      });

      senderSocket.emit('send_dm', emptyMessage);
    });

    test('should handle network interruption during message send', (done) => {
      const testMessage = {
        conversationId: `dm_${mockSender.id}_${mockReceiver.id}`,
        recipientId: mockReceiver.id,
        content: 'Test message during disconnection',
        messageType: 'text'
      };

      let messageReceived = false;

      receiverSocket.on('recived_dm', () => {
        messageReceived = true;
      });

      // Disconnect sender temporarily
      senderSocket.disconnect();

      setTimeout(() => {
        senderSocket.connect();
        
        setTimeout(() => {
          senderSocket.emit('send_dm', testMessage);
          
          setTimeout(() => {
            expect(messageReceived).toBe(true);
            done();
          }, 1000);
        }, 500);
      }, 500);
    });
  });
});