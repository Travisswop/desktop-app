'use client';

import {
  useLoginWithPasskey,
  useMfaEnrollment,
  usePrivy,
} from '@privy-io/react-auth';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';
import isUrl from '@/lib/isUrl';
import { useState } from 'react';
import logo from '@/public/logo.png';
import bellIcon from '@/public/images/bell-icon.png';
import { BiMessageSquareDots } from 'react-icons/bi';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

export default function Header() {
  const { user, loading, logout: userLogout } = useUser();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { state, loginWithPasskey } = useLoginWithPasskey();

  const {
    ready,
    authenticated,
    user: privyUser,
    exportWallet,
  } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaWallets();

  // Check that your user is authenticated
  const isAuthenticated = ready && authenticated;

  // Check that your user has an embedded wallet
  const hasEmbeddedWallet = !!privyUser?.linkedAccounts.find(
    (account) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      account.chainType === 'ethereum'
  );

  // Check for Solana wallet
  const hasSolanaWallet = !!privyUser?.linkedAccounts.find(
    (account) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      account.chainType === 'solana'
  );

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      // Use the UserContext logout function which already handles clearing session
      await userLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Revert loading state on error
      setIsLoggingOut(false);
      throw error; // Re-throw to allow error handling by parent components
    }
    // Only clear loading state on success to prevent UI flicker
    setIsLoggingOut(false);
  };

  const handleLoginWithPasskey = async () => {
    try {
      await loginWithPasskey();
    } catch (error) {
      console.error('Passkey login failed:', error);
    }
  };

  const handleExportEVMWallet = async () => {
    try {
      await exportWallet();
    } catch (error) {
      console.error('EVM wallet export failed:', error);
    }
  };

  const handleExportSolanaWallet = async () => {
    try {
      await exportSolanaWallet();
    } catch (error) {
      console.error('Solana wallet export failed:', error);
    }
  };

  if (loading) {
    return (
      <header className="bg-white p-6 flex justify-between items-center h-20 border-b">
        <Link href="/dashboard" className="h-20">
          <Image src={logo} alt="Logo" width={120} height={50} />
        </Link>
        <Skeleton className="h-14 w-48 rounded-full" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 h-20 items-center border-b bg-white px-4 flex justify-end">
      <div>
        <Link href="/chat">
          <button className="rounded-full w-[38px] h-[38px] bg-black flex items-center justify-center">
            <BiMessageSquareDots color="white" size={19} />
          </button>
          {/* <Button variant="black" className="gap-2 font-bold rounded-xl">
            <Image src={filePlus} alt="file-plus" className="w-6 h-6" />
            Create Microsite
          </Button> */}
        </Link>
      </div>
      <div className="bg-[#f6f6fd] p-2 rounded-full mx-2">
        <Image src={bellIcon} alt="bell icon" className="w-7 h-7" />
      </div>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-3 py-4 rounded-full bg-[#F7F7F9] hover:bg-accent h-14"
              disabled={isLoggingOut}
            >
              <div className="relative h-8 w-8">
                {user.profilePic && (
                  <>
                    {isUrl(user?.profilePic) ? (
                      <Image
                        src={user.profilePic}
                        alt={user.name || ''}
                        fill
                        className="rounded-full object-cover border"
                      />
                    ) : (
                      <Image
                        src={`/images/user_avator/${user.profilePic}.png`}
                        alt={user.name || ''}
                        fill
                        className="rounded-full object-cover"
                      />
                    )}
                  </>
                )}
              </div>
              <span className="text-sm font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              color="red"
              className="cursor-pointer"
              onSelect={() => {
                router.push('/account-settings');
              }}
            >
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem>
              <button onClick={handleLoginWithPasskey}>
                Passkey
              </button>
              {/* <div className="flex items-start gap-4">
                <div className="w-72 flex flex-col gap-3 bg-white rounded-xl shadow-medium p-4">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-1 font-medium">
                      <IoKeyOutline />
                      <p>Passkeys</p>
                    </div>
                  </div>
                  <p>Link a passkey to your account</p>
                  <DynamicPrimaryBtn onClick={loginWithPasskey}>
                    <LuPlus />
                    Link a Passkey
                  </DynamicPrimaryBtn>
                </div>
              </div> */}
            </DropdownMenuItem>

            <DropdownMenuItem>
              <button onClick={showMfaEnrollmentModal}>
                Biometrics
              </button>
              {/* <div className="w-96 flex flex-col gap-3 bg-white rounded-xl shadow-medium p-4">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-1 font-medium">
                    <IoLockClosedOutline />
                    <p>Transaction MFA</p>
                  </div>
                  <p className="text-gray-500">
                    {privyUser
                      ? privyUser?.mfaMethods?.length > 0
                        ? "Enabled"
                        : "Disabled"
                      : "Disabled"}
                  </p>
                </div>
                <p>
                  Add a second factor to sensitive embedded wallet actions to
                  protect your account. Verification lasts for 15 minutes.
                </p>
                <DynamicPrimaryBtn onClick={showMfaEnrollmentModal}>
                  {privyUser && privyUser?.mfaMethods?.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <MdOutlineEdit />
                      <span>Manage MFA</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <LuPlus />
                      <span>Add MFA</span>
                    </span>
                  )}
                </DynamicPrimaryBtn>
              </div> */}
            </DropdownMenuItem>

            {/* Export Wallet Sub-menu */}
            {(hasEmbeddedWallet || hasSolanaWallet) && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Export Wallet
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {hasEmbeddedWallet && (
                    <DropdownMenuItem
                      onClick={handleExportEVMWallet}
                      disabled={!isAuthenticated}
                    >
                      Export EVM Wallet
                    </DropdownMenuItem>
                  )}
                  {hasSolanaWallet && (
                    <DropdownMenuItem
                      onClick={handleExportSolanaWallet}
                      disabled={!isAuthenticated}
                    >
                      Export Solana Wallet
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
