import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Swop — Your identity, wallet, and booking page in one link",
  description:
    "Swop is a self-custody platform for digital identity and payments. Create a SmartSite that holds your links, products, self-custody wallet, and a booking page synced to your Google Calendar.",
};

/**
 * Public marketing home page. Served at `/` for signed-out visitors (see the
 * rewrite in middleware.ts) so the app's home page explains what Swop does
 * without requiring a login — a Google OAuth verification requirement, and the
 * reason the first verification attempt was rejected.
 */

const FEATURES = [
  {
    title: "SmartSite",
    body: "A customizable page for your links, contact details, content, and products. Share it as a link, a QR code, or by tapping an NFC card.",
  },
  {
    title: "Self-custody wallet",
    body: "Hold, send, and swap assets across Ethereum, Polygon, Base, and Solana. Swop never holds your funds and never has access to your private keys.",
  },
  {
    title: "Payments and storefront",
    body: "Sell products or accept payments in USDC, with checkout and order management built in.",
  },
  {
    title: "Booking",
    body: "Add a Meet tab so visitors can book time with you. Connects to your Google Calendar so only your genuinely free times are offered.",
  },
];

export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-[880px] px-6 py-14">
      {/* hero */}
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
        Swop
      </p>
      <h1 className="mt-3 max-w-[640px] text-[34px] font-bold leading-[1.15] tracking-[-0.03em] text-gray-950 sm:text-[42px]">
        Your identity, wallet, and booking page — in one link.
      </h1>
      <p className="mt-4 max-w-[600px] text-[16px] leading-relaxed text-gray-600">
        Swop is a self-custody platform for digital identity and payments. You
        create a public SmartSite, manage crypto wallets that only you control,
        take payments, and let people book time with you — all from a single
        link you own.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="rounded-full bg-gray-950 px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline"
        >
          Sign in or create an account
        </Link>
        <a
          href="https://www.swopme.co"
          className="rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-[13.5px] font-semibold text-gray-950 no-underline"
        >
          Learn more about Swop
        </a>
      </div>

      {/* what you can do */}
      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em] text-gray-950">
        What you can do with Swop
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <h3 className="text-[15px] font-bold text-gray-950">{f.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600">
              {f.body}
            </p>
          </div>
        ))}
      </div>

      {/* google calendar — the integration under OAuth review */}
      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em] text-gray-950">
        How Swop uses Google Calendar
      </h2>
      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[14px] leading-relaxed text-gray-700">
          If you add the booking feature to your SmartSite, you can connect your
          Google Calendar. Connecting is optional, and Swop uses that access for
          two things only:
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          <li className="flex gap-3 text-[14px] leading-relaxed text-gray-700">
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
            />
            <span>
              <b className="font-semibold text-gray-950">
                Reading your calendars
              </b>{" "}
              so times you are already busy are hidden from your public booking
              page, and so your own upcoming events appear on your Swop
              dashboard. This information is shown only to you.
            </span>
          </li>
          <li className="flex gap-3 text-[14px] leading-relaxed text-gray-700">
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
            />
            <span>
              <b className="font-semibold text-gray-950">
                Creating and updating events
              </b>{" "}
              on your calendar when someone books a time with you, including a
              Google Meet link — and removing that event if the booking is
              cancelled.
            </span>
          </li>
        </ul>
        <p className="mt-5 text-[13.5px] leading-relaxed text-gray-600">
          Swop does not sell calendar data, does not use it for advertising, and
          does not share it with third parties. You can disconnect Google at any
          time from your SmartSite, which revokes Swop&rsquo;s access. See the{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-gray-950 underline"
          >
            Privacy Policy
          </Link>{" "}
          for full detail.
        </p>
      </div>

      {/* footer */}
      <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/[0.06] pt-6 text-[13px] text-gray-500">
        <span className="font-semibold text-gray-950">Swop</span>
        <Link href="/privacy-policy" className="text-gray-500 no-underline">
          Privacy Policy
        </Link>
        <Link href="/terms-of-service" className="text-gray-500 no-underline">
          Terms of Service
        </Link>
        <a
          href="mailto:travis@swopme.co"
          className="text-gray-500 no-underline"
        >
          Contact
        </a>
      </div>
    </main>
  );
}
