/**
 * @jest-environment jsdom
 */

// global-error is the only boundary that catches a client-side crash in the
// app shell, and it used to discard the error. These tests pin the reporting
// behaviour: without the beacon, a user hitting "Something went wrong" leaves
// no trace anywhere we can read.
import { render, screen } from '@testing-library/react';
import GlobalError from '@/app/global-error';

describe('GlobalError reporting', () => {
  let sendBeacon: jest.Mock;

  beforeEach(() => {
    sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    document.cookie = 'user-id=6854cee7fc9ec119e1cfc892';
  });

  const makeError = () =>
    Object.assign(new Error('Cannot read properties of undefined'), {
      digest: '3849201756',
      name: 'TypeError',
    });

  // jsdom's Blob has no .text(), so read it through FileReader.
  async function readBeaconPayload() {
    const [, blob] = sendBeacon.mock.calls[0];
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob as Blob);
    });
    return JSON.parse(text);
  }

  it('beacons the crash to /api/client-error', async () => {
    render(<GlobalError error={makeError()} reset={jest.fn()} />);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/client-error');

    const payload = await readBeaconPayload();
    expect(payload.digest).toBe('3849201756');
    expect(payload.message).toBe('Cannot read properties of undefined');
    expect(payload.name).toBe('TypeError');
    // Identifies WHICH user crashed without the user reporting anything.
    expect(payload.userId).toBe('6854cee7fc9ec119e1cfc892');
    expect(typeof payload.route).toBe('string');
  });

  it('surfaces the digest so a report can be correlated to the log line', () => {
    render(<GlobalError error={makeError()} reset={jest.fn()} />);

    expect(screen.getByText(/3849201756/)).toBeInTheDocument();
  });

  it('never lets a reporting failure mask the original error', () => {
    sendBeacon.mockImplementation(() => {
      throw new Error('beacon blocked');
    });

    expect(() =>
      render(<GlobalError error={makeError()} reset={jest.fn()} />),
    ).not.toThrow();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('still renders when the error carries no digest', () => {
    render(<GlobalError error={new Error('boom')} reset={jest.fn()} />);

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
