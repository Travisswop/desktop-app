export interface WalletItem {
  address: string;
  isActive: boolean;
  isEVM: boolean;
}

export interface ReceiverData {
  address: string;
  isEns?: boolean;
  ensName?: string;
  avatar?: string;
}

/**
 * A recipient row returned by `GET /api/v1/user/search` (and the connections
 * list) and rendered in the Send flow's "TO" search. Most fields come from the
 * user record; agent-vault entries additionally carry `isAgent`/`agentId` so
 * the UI can badge them distinctly from real people.
 */
export interface SearchRecipient {
  _id?: string;
  name?: string;
  ens?: string;
  profilePic?: string;
  address?: string;
  ensData?: {
    solanaAddress?: string;
    evmAddress?: string;
  };
  /** True when this recipient is an agent vault rather than a person. */
  isAgent?: boolean;
  /** Identifier of the agent backing the vault, e.g. `goldman-sacks`. */
  agentId?: string;
  // Search results can carry additional backend fields we don't model here.
  [key: string]: unknown;
}
