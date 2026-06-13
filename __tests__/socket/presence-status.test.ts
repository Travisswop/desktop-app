import { io, Socket } from 'socket.io-client';

describe('Socket Presence & Status Events', () => {
  let mainSocket: Socket;
  let observerSocket1: Socket;
  let observerSocket2: Socket;
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  const mainUser = {
    id: 'main-user-123',
    name: 'Main User',
    email: 'main@example.com'
  };

  const observer1 = {
    id: 'observer1-456',
    name: 'Observer One',
    email: 'observer1@example.com'
  };

  const observer2 = {
    id: 'observer2-789',
    name: 'Observer Two',
    email: 'observer2@example.com'
  };

  beforeEach((done) => {
    let connectCount = 0;
    
    const checkConnections = () => {
      connectCount++;
      if (connectCount === 3) {
        // Register all users
        mainSocket.emit('register_user', mainUser);
        observerSocket1.emit('register_user', observer1);
        observerSocket2.emit('register_user', observer2);
        
        setTimeout(() => {
          done();
        }, 500);
      }
    };

    mainSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    observerSocket1 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    observerSocket2 = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    mainSocket.on('connect', checkConnections);
    observerSocket1.on('connect', checkConnections);
    observerSocket2.on('connect', checkConnections);

    mainSocket.connect();
    observerSocket1.connect();
    observerSocket2.connect();
  });

  afterEach(() => {
    if (mainSocket.connected) mainSocket.disconnect();
    if (observerSocket1.connected) observerSocket1.disconnect();
    if (observerSocket2.connected) observerSocket2.disconnect();
  });

  describe('Online/Offline Status', () => {
    test('should broadcast user online status', (done) => {
      let statusUpdates = 0;

      const checkStatusUpdate = (status: any) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.status).toBe('online');
        expect(status.timestamp).toBeDefined();
        statusUpdates++;
        
        if (statusUpdates === 2) {
          done();
        }
      };

      observerSocket1.on('user_online_status', checkStatusUpdate);
      observerSocket2.on('user_online_status', checkStatusUpdate);

      mainSocket.emit('user_online', {
        userId: mainUser.id,
        status: 'online',
        timestamp: new Date().toISOString()
      });
    });

    test('should handle user going offline', (done) => {
      observerSocket1.on('user_offline_status', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.status).toBe('offline');
        expect(status.lastSeen).toBeDefined();
        done();
      });

      mainSocket.emit('user_offline', {
        userId: mainUser.id,
        status: 'offline',
        lastSeen: new Date().toISOString()
      });
    });

    test('should track last seen timestamp', (done) => {
      const lastSeenTime = new Date().toISOString();

      observerSocket1.on('user_last_seen_updated', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.lastSeen).toBe(lastSeenTime);
        done();
      });

      mainSocket.emit('update_last_seen', {
        userId: mainUser.id,
        lastSeen: lastSeenTime
      });
    });

    test('should detect disconnection automatically', (done) => {
      observerSocket1.on('user_disconnected', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.reason).toBe('transport close');
        done();
      });

      // Simulate disconnection
      mainSocket.disconnect();
    });
  });

  describe('Away and Idle Status', () => {
    test('should handle away status', (done) => {
      const awayData = {
        userId: mainUser.id,
        status: 'away',
        reason: 'idle_timeout',
        duration: 300000 // 5 minutes in milliseconds
      };

      observerSocket1.on('user_away_status', (status) => {
        expect(status.userId).toBe(awayData.userId);
        expect(status.status).toBe('away');
        expect(status.reason).toBe(awayData.reason);
        done();
      });

      mainSocket.emit('user_away', awayData);
    });

    test('should handle idle status', (done) => {
      observerSocket1.on('user_idle_status', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.status).toBe('idle');
        expect(typeof status.idleDuration).toBe('number');
        done();
      });

      mainSocket.emit('user_idle', {
        userId: mainUser.id,
        status: 'idle',
        idleDuration: 600000 // 10 minutes
      });
    });

    test('should return from away status', (done) => {
      observerSocket1.on('user_back_from_away', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.status).toBe('online');
        expect(status.previousStatus).toBe('away');
        done();
      });

      // First go away, then come back
      mainSocket.emit('user_away', {
        userId: mainUser.id,
        status: 'away'
      });

      setTimeout(() => {
        mainSocket.emit('user_back_online', {
          userId: mainUser.id,
          status: 'online',
          previousStatus: 'away'
        });
      }, 100);
    });

    test('should handle automatic idle detection', (done) => {
      let idleDetected = false;

      observerSocket1.on('user_auto_idle', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.autoDetected).toBe(true);
        idleDetected = true;
        done();
      });

      mainSocket.emit('start_idle_detection', {
        userId: mainUser.id,
        idleThreshold: 1000 // 1 second for testing
      });

      // Simulate no activity for idle threshold
      setTimeout(() => {
        if (!idleDetected) {
          done(new Error('Auto idle detection failed'));
        }
      }, 2000);
    });
  });

  describe('Custom Status Messages', () => {
    test('should set custom status message', (done) => {
      const customStatus = {
        userId: mainUser.id,
        status: 'online',
        customMessage: '🎯 Focused on coding',
        emoji: '🎯',
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };

      observerSocket1.on('user_custom_status_updated', (status) => {
        expect(status.userId).toBe(customStatus.userId);
        expect(status.customMessage).toBe(customStatus.customMessage);
        expect(status.emoji).toBe(customStatus.emoji);
        expect(status.expiresAt).toBeDefined();
        done();
      });

      mainSocket.emit('set_custom_status', customStatus);
    });

    test('should clear custom status', (done) => {
      observerSocket1.on('user_custom_status_cleared', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.customMessage).toBe('');
        done();
      });

      mainSocket.emit('clear_custom_status', {
        userId: mainUser.id
      });
    });

    test('should handle status expiration', (done) => {
      const shortLivedStatus = {
        userId: mainUser.id,
        customMessage: 'In a meeting',
        expiresAt: new Date(Date.now() + 1000).toISOString() // 1 second
      };

      observerSocket1.on('user_status_expired', (status) => {
        expect(status.userId).toBe(mainUser.id);
        expect(status.wasCustomMessage).toBe(shortLivedStatus.customMessage);
        done();
      });

      mainSocket.emit('set_custom_status', shortLivedStatus);
    });

    test('should handle predefined status options', (done) => {
      const predefinedStatus = {
        userId: mainUser.id,
        statusType: 'busy',
        statusMessage: 'In a meeting',
        emoji: '🔴'
      };

      observerSocket1.on('user_predefined_status_set', (status) => {
        expect(status.userId).toBe(predefinedStatus.userId);
        expect(status.statusType).toBe('busy');
        expect(status.statusMessage).toBe(predefinedStatus.statusMessage);
        done();
      });

      mainSocket.emit('set_predefined_status', predefinedStatus);
    });
  });

  describe('Presence in Conversations', () => {
    test('should show typing indicators with presence', (done) => {
      const conversationId = `dm_${mainUser.id}_${observer1.id}`;

      observerSocket1.on('user_typing_with_presence', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.conversationId).toBe(conversationId);
        expect(data.presenceStatus).toBe('online');
        expect(data.isTyping).toBe(true);
        done();
      });

      mainSocket.emit('typing_with_presence', {
        userId: mainUser.id,
        conversationId,
        recipientId: observer1.id,
        isTyping: true,
        presenceStatus: 'online'
      });
    });

    test('should show last seen in conversation context', (done) => {
      const conversationId = `dm_${mainUser.id}_${observer1.id}`;

      observerSocket1.on('conversation_presence_updated', (data) => {
        expect(data.conversationId).toBe(conversationId);
        expect(data.userId).toBe(mainUser.id);
        expect(data.lastSeenInConversation).toBeDefined();
        done();
      });

      mainSocket.emit('update_conversation_presence', {
        userId: mainUser.id,
        conversationId,
        lastSeenInConversation: new Date().toISOString()
      });
    });

    test('should handle group presence updates', (done) => {
      const groupId = 'group-123';
      
      observerSocket1.on('group_presence_updated', (data) => {
        expect(data.groupId).toBe(groupId);
        expect(data.userId).toBe(mainUser.id);
        expect(data.status).toBe('online');
        done();
      });

      mainSocket.emit('update_group_presence', {
        userId: mainUser.id,
        groupId,
        status: 'online',
        lastActiveInGroup: new Date().toISOString()
      });
    });
  });

  describe('Bulk Presence Operations', () => {
    test('should get all users presence status', (done) => {
      mainSocket.on('all_users_presence', (presenceData) => {
        expect(Array.isArray(presenceData)).toBe(true);
        expect(presenceData.length).toBeGreaterThan(0);
        
        const observerPresence = presenceData.find(p => p.userId === observer1.id);
        expect(observerPresence).toBeDefined();
        expect(observerPresence.status).toBeDefined();
        done();
      });

      mainSocket.emit('get_all_presence');
    });

    test('should get specific users presence', (done) => {
      const userIds = [observer1.id, observer2.id];

      mainSocket.on('specific_users_presence', (presenceData) => {
        expect(Array.isArray(presenceData)).toBe(true);
        expect(presenceData.length).toBe(userIds.length);
        
        userIds.forEach(userId => {
          const userPresence = presenceData.find(p => p.userId === userId);
          expect(userPresence).toBeDefined();
        });
        done();
      });

      mainSocket.emit('get_users_presence', { userIds });
    });

    test('should subscribe to presence updates for specific users', (done) => {
      const watchList = [observer1.id, observer2.id];
      let presenceUpdates = 0;

      mainSocket.on('watched_user_presence_update', (update) => {
        expect(watchList.includes(update.userId)).toBe(true);
        presenceUpdates++;
        
        if (presenceUpdates === 2) {
          done();
        }
      });

      mainSocket.emit('subscribe_to_presence', { userIds: watchList });

      // Trigger presence updates
      setTimeout(() => {
        observerSocket1.emit('user_online', {
          userId: observer1.id,
          status: 'online'
        });
        
        observerSocket2.emit('user_away', {
          userId: observer2.id,
          status: 'away'
        });
      }, 100);
    });

    test('should unsubscribe from presence updates', (done) => {
      const watchList = [observer1.id];

      mainSocket.emit('subscribe_to_presence', { userIds: watchList });

      setTimeout(() => {
        mainSocket.emit('unsubscribe_from_presence', { userIds: watchList });
        
        // This should not trigger an event on mainSocket
        observerSocket1.emit('user_online', {
          userId: observer1.id,
          status: 'online'
        });
        
        setTimeout(() => {
          done(); // If no event was received, test passes
        }, 500);
      }, 100);

      mainSocket.on('watched_user_presence_update', () => {
        done(new Error('Should not receive presence updates after unsubscribing'));
      });
    });
  });

  describe('Unread Count Management', () => {
    test('should get unread message counts', (done) => {
      mainSocket.on('unread_counts', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(typeof data.totalUnread).toBe('number');
        expect(Array.isArray(data.conversationCounts)).toBe(true);
        expect(Array.isArray(data.groupCounts)).toBe(true);
        done();
      });

      mainSocket.emit('fetch_unread_counts', { userId: mainUser.id });
    });

    test('should update unread counts in real-time', (done) => {
      const conversationId = `dm_${observer1.id}_${mainUser.id}`;

      mainSocket.on('unread_count_updated', (data) => {
        expect(data.conversationId).toBe(conversationId);
        expect(data.userId).toBe(mainUser.id);
        expect(typeof data.unreadCount).toBe('number');
        done();
      });

      // Send a message to trigger unread count update
      observerSocket1.emit('send_dm', {
        conversationId,
        recipientId: mainUser.id,
        content: 'This should increase unread count',
        messageType: 'text'
      });
    });

    test('should reset unread count when conversation is opened', (done) => {
      const conversationId = `dm_${observer1.id}_${mainUser.id}`;

      mainSocket.on('unread_count_reset', (data) => {
        expect(data.conversationId).toBe(conversationId);
        expect(data.userId).toBe(mainUser.id);
        expect(data.unreadCount).toBe(0);
        done();
      });

      mainSocket.emit('reset_unread_count', {
        userId: mainUser.id,
        conversationId
      });
    });

    test('should handle unread counts for multiple conversations', (done) => {
      mainSocket.on('all_unread_counts', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(Array.isArray(data.conversations)).toBe(true);
        
        if (data.conversations.length > 0) {
          const conversation = data.conversations[0];
          expect(conversation.conversationId).toBeDefined();
          expect(typeof conversation.unreadCount).toBe('number');
        }
        done();
      });

      mainSocket.emit('get_all_unread_counts', { userId: mainUser.id });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid user ID in presence request', (done) => {
      mainSocket.on('presence_error', (error) => {
        expect(error.type).toBe('invalid_user_id');
        expect(error.userId).toBe('invalid-user-999');
        done();
      });

      mainSocket.emit('get_user_presence', { userId: 'invalid-user-999' });
    });

    test('should handle presence updates for non-existent conversations', (done) => {
      mainSocket.on('conversation_presence_error', (error) => {
        expect(error.type).toBe('conversation_not_found');
        expect(error.conversationId).toBe('invalid-conversation-123');
        done();
      });

      mainSocket.emit('update_conversation_presence', {
        userId: mainUser.id,
        conversationId: 'invalid-conversation-123'
      });
    });

    test('should handle rapid status changes', (done) => {
      let statusChanges = 0;

      observerSocket1.on('user_status_throttled', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.throttled).toBe(true);
        done();
      });

      // Send rapid status updates
      for (let i = 0; i < 20; i++) {
        mainSocket.emit('user_online', {
          userId: mainUser.id,
          status: 'online'
        });
      }
    });

    test('should maintain presence state during reconnection', (done) => {
      let reconnectionComplete = false;

      mainSocket.on('presence_restored', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.status).toBeDefined();
        reconnectionComplete = true;
        done();
      });

      // Disconnect and reconnect
      mainSocket.disconnect();
      
      setTimeout(() => {
        mainSocket.connect();
      }, 500);
    });

    test('should handle presence cleanup for disconnected users', (done) => {
      observerSocket1.on('user_presence_cleaned', (data) => {
        expect(data.userId).toBe(mainUser.id);
        expect(data.reason).toBe('disconnected');
        done();
      });

      // Simulate abrupt disconnection
      mainSocket.disconnect();
    });
  });
});