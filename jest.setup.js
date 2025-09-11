// Global test setup
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock WebSocket for socket.io-client
global.WebSocket = class WebSocket {
  constructor() {
    this.readyState = WebSocket.CONNECTING
  }
  
  static get CONNECTING() { return 0 }
  static get OPEN() { return 1 }
  static get CLOSING() { return 2 }
  static get CLOSED() { return 3 }
}

// Increase timeout for socket tests
jest.setTimeout(10000)