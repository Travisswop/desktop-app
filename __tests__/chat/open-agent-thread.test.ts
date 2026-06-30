jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

import toast from 'react-hot-toast';
import { openAgentThreadWithFeedback } from '@/components/chat/openAgentThread';

describe('openAgentThreadWithFeedback', () => {
  const toastError = toast.error as jest.Mock;
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  beforeEach(() => {
    toastError.mockReset();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows a toast and swallows failures by default', async () => {
    const error = new Error('Desk unavailable');

    await expect(
      openAgentThreadWithFeedback(
        jest.fn().mockRejectedValue(error),
        'astro'
      )
    ).resolves.toBeUndefined();

    expect(toastError).toHaveBeenCalledWith('Desk unavailable');
  });

  it('rethrows failures when inline recovery needs to handle them', async () => {
    const error = new Error('Desk unavailable');

    await expect(
      openAgentThreadWithFeedback(
        jest.fn().mockRejectedValue(error),
        'astro',
        { propagateErrors: true }
      )
    ).rejects.toThrow('Desk unavailable');

    expect(toastError).not.toHaveBeenCalled();
  });
});
