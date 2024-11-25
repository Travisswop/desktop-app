interface PrivyUser {
  google?: { email: string };
  email?: { address: string };
  linkedAccounts: Array<{
    type: string;
    address?: string;
    email?: string;
  }>;
}

export interface AuthState {
  user: PrivyUser | null;
  ready: boolean;
}
