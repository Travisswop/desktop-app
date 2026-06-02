/**
 * Socket Events Test Runner
 * 
 * This script provides utilities for running socket event tests
 * and managing test environments.
 */

import { io, Socket } from 'socket.io-client';

export class SocketTestRunner {
  private sockets: Socket[] = [];
  private readonly SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

  /**
   * Create multiple socket connections for testing
   */
  async createSockets(count: number): Promise<Socket[]> {
    const sockets: Socket[] = [];

    for (let i = 0; i < count; i++) {
      const socket = io(this.SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
      });
      sockets.push(socket);
      this.sockets.push(socket);
    }

    return new Promise((resolve) => {
      let connectedCount = 0;
      
      const checkConnections = () => {
        connectedCount++;
        if (connectedCount === count) {
          resolve(sockets);
        }
      };

      sockets.forEach(socket => {
        socket.on('connect', checkConnections);
        socket.connect();
      });
    });
  }

  /**
   * Register users for testing
   */
  async registerUsers(sockets: Socket[], users: any[]): Promise<void> {
    return new Promise((resolve) => {
      let registeredCount = 0;

      const checkRegistrations = () => {
        registeredCount++;
        if (registeredCount === users.length) {
          setTimeout(() => resolve(), 500); // Allow time for server processing
        }
      };

      users.forEach((user, index) => {
        const socket = sockets[index];
        socket.on('user_registered', checkRegistrations);
        socket.emit('register_user', user);
      });
    });
  }

  /**
   * Wait for specific event on multiple sockets
   */
  waitForEvent(sockets: Socket[], eventName: string, expectedCount?: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const target = expectedCount || sockets.length;

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventName} on ${target} sockets`));
      }, 10000);

      const handleEvent = (data: any) => {
        results.push(data);
        if (results.length >= target) {
          clearTimeout(timeout);
          resolve(results);
        }
      };

      sockets.forEach(socket => {
        socket.on(eventName, handleEvent);
      });
    });
  }

  /**
   * Clean up all sockets
   */
  cleanup(): void {
    this.sockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    this.sockets = [];
  }

  /**
   * Create mock user data
   */
  static createMockUser(id: string, name?: string): any {
    return {
      id,
      name: name || `User ${id}`,
      email: `${id}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
    };
  }

  /**
   * Create mock group data
   */
  static createMockGroup(id: string, createdBy: string, members: string[]): any {
    return {
      groupId: id,
      groupName: `Test Group ${id}`,
      description: `Test group for ${id}`,
      createdBy,
      members,
      isPrivate: false,
      channels: [{
        id: `channel-${id}`,
        name: 'general',
        description: 'General discussion'
      }]
    };
  }

  /**
   * Create mock message data
   */
  static createMockMessage(senderId: string, recipientId?: string, groupId?: string): any {
    const base = {
      senderId,
      content: `Test message from ${senderId} at ${Date.now()}`,
      messageType: 'text' as const,
      timestamp: new Date().toISOString()
    };

    if (groupId) {
      return {
        ...base,
        groupId,
        channelId: `channel-${groupId}`
      };
    }

    return {
      ...base,
      recipientId,
      conversationId: `dm_${senderId}_${recipientId}`
    };
  }

  /**
   * Measure event latency
   */
  async measureEventLatency(socket: Socket, eventName: string, data: any): Promise<number> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      socket.once(`${eventName}_response`, () => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });

      socket.emit(eventName, data);
    });
  }

  /**
   * Test connection stability
   */
  async testConnectionStability(socket: Socket, duration: number = 5000): Promise<boolean> {
    let disconnected = false;

    socket.on('disconnect', () => {
      disconnected = true;
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(!disconnected && socket.connected);
      }, duration);
    });
  }
}

/**
 * Test utilities for common socket testing patterns
 */
export const SocketTestUtils = {
  /**
   * Assert event was received within timeout
   */
  async expectEvent(socket: Socket, eventName: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventName} not received within ${timeout}ms`));
      }, timeout);

      socket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },

  /**
   * Assert multiple events in sequence
   */
  async expectEventSequence(socket: Socket, events: string[], timeout: number = 10000): Promise<any[]> {
    const results: any[] = [];
    
    for (const event of events) {
      const data = await this.expectEvent(socket, event, timeout);
      results.push(data);
    }
    
    return results;
  },

  /**
   * Simulate network delay
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate random test data
   */
  randomString(length: number = 8): string {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Create test conversation ID
   */
  createConversationId(user1: string, user2: string): string {
    return `dm_${user1}_${user2}`;
  },

  /**
   * Validate message structure
   */
  validateMessage(message: any, expectedFields: string[] = []): boolean {
    const requiredFields = ['senderId', 'content', 'messageType', 'timestamp', ...expectedFields];
    return requiredFields.every(field => message.hasOwnProperty(field));
  },

  /**
   * Validate user presence data
   */
  validatePresence(presence: any): boolean {
    const requiredFields = ['userId', 'status'];
    return requiredFields.every(field => presence.hasOwnProperty(field)) &&
           ['online', 'offline', 'away', 'idle'].includes(presence.status);
  }
};

export default SocketTestRunner;