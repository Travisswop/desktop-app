'use strict';

// Next.js Turbopack (and some dependencies) may resolve `buffer` to the npm
// `buffer` polyfill package. That package does not export `constants`, but some
// Node-oriented deps (e.g. `thread-stream`) expect `require('buffer').constants`.
//
// This shim keeps the polyfill behavior while providing a compatible
// `constants.MAX_STRING_LENGTH` export.

const buffer = require('buffer/');

// Node 20+ `buffer.constants.MAX_STRING_LENGTH` is ~536,870,888.
// For browsers/polyfills we just need a safe upper bound for string sizing.
const DEFAULT_MAX_STRING_LENGTH = 0x1fffffe8; // 536870888

if (!buffer.constants) buffer.constants = {};
if (!buffer.constants.MAX_LENGTH && typeof buffer.kMaxLength === 'number') {
  buffer.constants.MAX_LENGTH = buffer.kMaxLength;
}
if (!buffer.constants.MAX_STRING_LENGTH) {
  buffer.constants.MAX_STRING_LENGTH = DEFAULT_MAX_STRING_LENGTH;
}

module.exports = buffer;

