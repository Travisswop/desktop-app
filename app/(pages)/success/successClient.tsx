"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams!.get("session_id");

  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/subscription/checkout-session/${sessionId}`
        );
        setSessionData(response.data);
      } catch (err: any) {
        console.error("Error fetching session:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // loading UI
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  // error UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/subscribe")}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No subscription data found.</p>
        </div>
      </div>
    );
  }

  const { session, subscription, customer } = sessionData;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to {subscription?.plan?.nickname || "Your Subscription"}!
          </h1>
          <p className="text-gray-600">
            Your subscription has been successfully activated.
          </p>
        </div>

        {/* Subscription Details */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Subscription Details
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Plan Information
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>Plan:</strong> {subscription?.plan?.nickname}
                </p>
                <p>
                  <strong>Amount:</strong> $
                  {(subscription?.plan?.amount / 100).toFixed(2)} /{" "}
                  {subscription?.plan?.interval}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-sm ${
                      subscription?.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {subscription?.status}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Billing Information
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>Customer:</strong> {customer?.email}
                </p>
                <p>
                  <strong>Current Period:</strong>{" "}
                  {new Date(
                    subscription?.current_period_start * 1000
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    subscription?.current_period_end * 1000
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Next Billing:</strong>{" "}
                  {new Date(
                    subscription?.current_period_end * 1000
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {session?.payment_intent && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Payment Information
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>Transaction ID:</strong> {session.payment_intent.id}
                </p>
                <p>
                  <strong>Amount Paid:</strong> $
                  {(session.amount_total / 100).toFixed(2)}
                </p>
                <p>
                  <strong>Payment Status:</strong>
                  <span className="ml-2 px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                    Paid
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            What’s Next?
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span> You now have access
              to all premium features.
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span> Subscription will
              renew on{" "}
              {new Date(
                subscription?.current_period_end * 1000
              ).toLocaleDateString()}
              .
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span> You can manage it in
              your account settings.
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push("/account/subscription")}
            className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 font-medium"
          >
            Manage Subscription
          </button>
        </div>

        {session?.invoice && (
          <div className="text-center mt-6">
            <a
              href={`https://invoice.stripe.com/i/${session.invoice}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Receipt/Invoice
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
