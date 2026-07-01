import { getSocketConnectSources } from '@/lib/security/csp';

describe('getSocketConnectSources', () => {
  it('adds the websocket origin for secure socket hosts', () => {
    expect(getSocketConnectSources('https://app.apiswop.co')).toEqual([
      'https://app.apiswop.co',
      'wss://app.apiswop.co',
    ]);
  });

  it('adds the websocket origin for local http socket hosts', () => {
    expect(getSocketConnectSources('http://localhost:4000')).toEqual([
      'http://localhost:4000',
      'ws://localhost:4000',
    ]);
  });
});
