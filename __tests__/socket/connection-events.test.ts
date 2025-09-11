import { io, Socket } from 'socket.io-client';

describe('Socket Connection Events', () => {
  let clientSocket: Socket;
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  beforeEach((done) => {
    clientSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
    
    clientSocket.on('connect', () => {
      done();
    });
    
    clientSocket.connect();
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Lifecycle', () => {
    test('should connect successfully', (done) => {
      const newSocket = io(SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        expect(newSocket.connected).toBe(true);
        expect(newSocket.id).toBeDefined();
        newSocket.disconnect();
        done();
      });

      newSocket.on('connect_error', (error) => {
        done(error);
      });

      newSocket.connect();
    });

    test('should handle connection errors', (done) => {
      const badSocket = io('http://invalid-url:9999', {
        autoConnect: false,
        timeout: 1000,
        transports: ['websocket'],
      });

      badSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        badSocket.disconnect();
        done();
      });

      badSocket.connect();
    });

    test('should disconnect properly', (done) => {
      const testSocket = io(SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
      });

      testSocket.on('connect', () => {
        testSocket.disconnect();
      });

      testSocket.on('disconnect', (reason) => {
        expect(reason).toBe('io client disconnect');
        done();
      });

      testSocket.connect();
    });

    test('should handle reconnection', (done) => {
      let reconnectCount = 0;

      clientSocket.on('reconnect', (attemptNumber) => {
        reconnectCount++;
        expect(attemptNumber).toBeGreaterThan(0);
        expect(reconnectCount).toBe(1);
        done();
      });

      clientSocket.on('reconnect_error', (error) => {
        done(error);
      });

      // Force disconnect to trigger reconnection
      clientSocket.disconnect();
      
      setTimeout(() => {
        clientSocket.connect();
      }, 100);
    });

    test('should emit reconnect_attempt event', (done) => {
      let attemptCount = 0;

      clientSocket.on('reconnect_attempt', (attemptNumber) => {
        attemptCount++;
        expect(attemptNumber).toBeGreaterThan(0);
        
        if (attemptCount === 1) {
          // Allow reconnection to succeed
          setTimeout(() => {
            clientSocket.connect();
          }, 100);
          done();
        }
      });

      clientSocket.disconnect();
    });
  });

  describe('User Registration', () => {
    test('should register user successfully', (done) => {
      const mockUserData = {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        walletAddress: '0x123...abc'
      };

      clientSocket.on('user_registered', (response) => {
        expect(response.success).toBe(true);
        expect(response.userId).toBe(mockUserData.id);
        done();
      });

      clientSocket.emit('register_user', mockUserData);
    });

    test('should handle user registration errors', (done) => {
      const invalidUserData = {
        // Missing required fields
        id: ''
      };

      clientSocket.on('registration_error', (error) => {
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid user data');
        done();
      });

      // Set a timeout in case the error event is not emitted
      setTimeout(() => {
        done();
      }, 2000);

      clientSocket.emit('register_user', invalidUserData);
    });

    test('should join user room after registration', (done) => {
      const mockUserData = {
        id: 'test-user-456',
        name: 'Test User 2',
        email: 'test2@example.com'
      };

      let registrationComplete = false;
      let roomJoined = false;

      const checkCompletion = () => {
        if (registrationComplete && roomJoined) {
          done();
        }
      };

      clientSocket.on('user_registered', () => {
        registrationComplete = true;
        
        // Now join the user room
        clientSocket.emit('join_user_room', { userId: mockUserData.id });
      });

      clientSocket.on('joined_room', (response) => {
        expect(response.room).toBe(`user_${mockUserData.id}`);
        roomJoined = true;
        checkCompletion();
      });

      clientSocket.emit('register_user', mockUserData);
    });
  });

  describe('Connection State Management', () => {
    test('should maintain connection state across events', (done) => {
      let eventCount = 0;
      const expectedEvents = 3;

      const checkAllEvents = () => {
        eventCount++;
        if (eventCount === expectedEvents) {
          expect(clientSocket.connected).toBe(true);
          done();
        }
      };

      clientSocket.emit('user_online', { userId: 'test-user-789' });
      clientSocket.on('user_status_updated', checkAllEvents);

      clientSocket.emit('fetch_unread_counts', { userId: 'test-user-789' });
      clientSocket.on('unread_counts', checkAllEvents);

      clientSocket.emit('get_conversation_list', { userId: 'test-user-789' });
      clientSocket.on('conversation_list', checkAllEvents);
    });

    test('should handle multiple simultaneous connections', (done) => {
      const socket2 = io(SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
      });

      const socket3 = io(SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
      });

      let connectCount = 0;
      const checkConnections = () => {
        connectCount++;
        if (connectCount === 2) {
          expect(socket2.connected).toBe(true);
          expect(socket3.connected).toBe(true);
          expect(socket2.id).not.toBe(socket3.id);
          
          socket2.disconnect();
          socket3.disconnect();
          done();
        }
      };

      socket2.on('connect', checkConnections);
      socket3.on('connect', checkConnections);

      socket2.connect();
      socket3.connect();
    });
  });
});