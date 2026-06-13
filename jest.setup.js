// Global test setup
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Increase timeout for socket tests
jest.setTimeout(10000)
