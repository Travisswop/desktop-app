"use client";

import { useLinkWithPasskey, usePrivy } from "@privy-io/react-auth";
import { Spinner } from "@nextui-org/react";
import { RiFingerprintLine } from "react-icons/ri";
import toast from "react-hot-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function getPasskeyErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  const maybeError = error as {
    code?: unknown;
    data?: { code?: unknown };
    privyErrorCode?: unknown;
  };
  const code =
    maybeError.privyErrorCode ?? maybeError.code ?? maybeError.data?.code;

  return typeof code === "string" ? code : "";
}

function formatPasskeyLinkError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const code = getPasskeyErrorCode(error);

  if (code === "disallowed_login_method" || code === "passkey_not_allowed") {
    return "Passkeys are not enabled for this app yet.";
  }
  if (/cancel|abort/i.test(message)) return "Passkey setup was cancelled.";
  if (/not supported|unsupported|not allowed/i.test(message)) {
    return "This browser or device does not support passkeys here.";
  }

  return message || "Could not create a sign-in passkey. Try again or use email login.";
}

export default function AccountSecurityPage() {
  const { user } = usePrivy();
  const { linkWithPasskey, state } = useLinkWithPasskey();
  const passkeyAccounts =
    user?.linkedAccounts?.filter((account) => account.type === "passkey") ?? [];
  const hasPasskey = passkeyAccounts.length > 0;
  const transactionPasskeyEnabled = user?.mfaMethods?.includes("passkey") ?? false;
  const busy =
    state.status === "generating-challenge" ||
    state.status === "awaiting-passkey" ||
    state.status === "submitting-response";

  const handleCreatePasskey = async () => {
    if (busy) return;

    try {
      await linkWithPasskey();
      toast.success("Sign-in passkey created. Transaction security was not changed.");
    } catch (error) {
      toast.error(formatPasskeyLinkError(error));
    }
  };

  return (
    <main className="mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500">Account</p>
        <h1 className="text-2xl font-semibold text-gray-950">Account Security</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Manage how you sign in. Wallet transaction verification is configured
          separately in Wallet Settings.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <RiFingerprintLine size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Sign-in passkeys</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    hasPasskey
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {hasPasskey ? "Ready" : "Not set up"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Sign in with Face ID, Touch ID, Windows Hello, or a hardware key
                instead of an email code.
              </p>
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
                Login only · Passkey verification for transactions is currently{" "}
                <strong>{transactionPasskeyEnabled ? "on" : "off"}</strong> and
                will not be changed.
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Save the passkey to the password manager you use across your devices.
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant={hasPasskey ? "outline" : "black"}
                disabled={busy}
                className="w-full shrink-0 sm:w-auto"
              >
                {busy ? (
                  <>
                    <Spinner size="sm" color={hasPasskey ? "default" : "white"} />
                    Check your passkey prompt
                  </>
                ) : hasPasskey ? (
                  "Add another sign-in passkey"
                ) : (
                  "Create sign-in passkey"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create a sign-in passkey?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your browser will open its passkey setup. This adds a login
                  method only and will not enable passkey verification for wallet
                  transactions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreatePasskey}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </main>
  );
}
