"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { deleteUserAccount } from "@/actions/deleteProfile";
import { Button } from "@/components/ui/button";
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
import { useUser } from "@/lib/UserContext";

export default function AccountDeletionPage() {
  const router = useRouter();
  const { user, loading, logout } = useUser();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = useMemo(
    () => confirmationText.trim().toLowerCase() === "delete",
    [confirmationText],
  );

  const handleDeleteAccount = async () => {
    if (!user?._id || !user.email || !canDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteUserAccount({
        payload: {
          email: user.email,
          id: user._id,
        },
      });

      toast.success("Account deleted");
      await logout();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-xl bg-white p-8 shadow-small">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Delete your account
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            This permanently deletes your Swop account and removes your account
            data from our servers. This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-red-100 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-950">
          Before you continue
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-900">
          <li>Your profile and account information will be deleted.</li>
          <li>You will be signed out immediately after deletion.</li>
          <li>Any active subscriptions should be managed before deleting.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="delete-confirmation"
          className="text-sm font-medium text-gray-800"
        >
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirmation"
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          className="h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
          placeholder="DELETE"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || isDeleting || !user}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Your account will be permanently
                deleted and you will be signed out.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/account-settings?upgrade=true")}
          disabled={isDeleting}
        >
          Manage subscriptions
        </Button>
      </div>
    </section>
  );
}
