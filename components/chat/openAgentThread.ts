import toast from 'react-hot-toast';

export interface OpenAgentThreadOptions {
  propagateErrors?: boolean;
}

export type OpenAgentThread = (
  agentId: string,
  options?: OpenAgentThreadOptions
) => void | Promise<void>;

export async function openAgentThreadWithFeedback<T extends string>(
  openAgentThread: (agentId: T) => void | Promise<void>,
  agentId: T,
  options?: OpenAgentThreadOptions
) {
  try {
    await openAgentThread(agentId);
  } catch (error) {
    console.error('Failed to open agent thread', error);

    if (options?.propagateErrors) {
      throw error;
    }

    toast.error(
      error instanceof Error
        ? error.message
        : 'Could not open the agent desk.'
    );
  }
}
