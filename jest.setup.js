// Global test setup
// jsdom does not provide TextEncoder/TextDecoder as globals; node does. Pull
// from util so the same setup file works under both test environments.
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = global.TextEncoder || TextEncoder
global.TextDecoder = global.TextDecoder || TextDecoder

// jsdom has no ResizeObserver; components measuring themselves (feed cards)
// need at least a no-op implementation to render.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// DOM matchers (toBeInTheDocument, toHaveTextContent, ...) for component tests.
require('@testing-library/jest-dom')

// Increase timeout for socket tests
jest.setTimeout(10000)
