import type { Metadata } from "next";
import Link from "next/link";

/**
 * Absolute, not relative. Google's OAuth homepage check requires the privacy
 * policy link ON this page to match the URL configured on the consent screen
 * verbatim — a relative "/privacy-policy" href does not string-match the
 * configured "https://www.swopme.app/privacy-policy" and fails verification.
 * Keep these in sync with the Branding page in the Google Cloud console.
 */
const PRIVACY_URL = "https://www.swopme.app/privacy-policy";
const TERMS_URL = "https://www.swopme.app/terms-of-service";

export const metadata: Metadata = {
  title: "Swop — a personal page, crypto wallet, and booking calendar in one link",
  description:
    "Swop is an app for creating a public personal page (a SmartSite) that holds your links, products, and contact details, managing crypto wallets only you control, accepting payments, and letting visitors book meetings that appear on your Google Calendar.",
};

/**
 * Public marketing home page. Served at `/` for signed-out visitors (see the
 * rewrite in middleware.ts).
 *
 * Google OAuth verification checks this page and rejected it twice: first for
 * being behind a login, then for not explaining the app's purpose. Keep the
 * opening plainly declarative — the app name, then what it is, in a single
 * sentence, before any marketing language — and keep the Google Calendar
 * section, which states the scope justification where a reviewer will see it.
 */

const FEATURES = [
  {
    title: "SmartSite — your public page",
    body: "Build a page that holds your links, contact details, content, and products. Share it as a link, as a QR code, or by tapping an NFC card. It works as your profile, your business card, and your storefront.",
  },
  {
    title: "A wallet you control",
    body: "Hold, send, and swap crypto across Ethereum, Polygon, Base, and Solana. Swop is self-custody: we never hold your funds and never have access to your private keys.",
  },
  {
    title: "Payments and orders",
    body: "Sell products or accept payments in USDC directly from your page, with checkout, receipts, and order management built in.",
  },
  {
    title: "Booking and meetings",
    body: "Add a Meet tab so visitors can book time with you. It connects to your Google Calendar so only the times you are genuinely free get offered, and each booking creates a Google Meet link.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create your SmartSite",
    body: "Sign up and claim a username. You get a public page at your own link, plus a QR code you can print or program onto an NFC card.",
  },
  {
    n: "2",
    title: "Add what you need",
    body: "Choose from templates — links, products, a blog, a tip jar, a booking calendar, and more. Everything is optional and you can rearrange it any time.",
  },
  {
    n: "3",
    title: "Share it and get paid",
    body: "Send people your link. They can browse your page, buy from you, pay you, or book a meeting — without needing a Swop account themselves.",
  },
];

export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-[880px] px-6 py-14">
      {/* hero — plain statement of what the app is, before any tagline */}
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
        Swop
      </p>
      <h1 className="mt-3 max-w-[720px] text-[32px] font-bold leading-[1.18] tracking-[-0.03em] text-gray-950 sm:text-[38px]">
        Swop is a personal page, a crypto wallet, and a booking calendar — in
        one link.
      </h1>
      <p className="mt-5 max-w-[660px] text-[16px] leading-relaxed text-gray-600">
        Swop lets anyone create a public page called a SmartSite that holds
        their links, products, and contact details; manage crypto wallets that
        only they control; accept payments; and let visitors book meetings that
        appear on their Google Calendar. It is free to start and works in any
        browser.
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
          Visit swopme.co
        </a>
      </div>

      {/* what is swop */}
      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em] text-gray-950">
        What is Swop?
      </h2>
      <div className="mt-3 flex max-w-[720px] flex-col gap-4 text-[15px] leading-relaxed text-gray-700">
        <p>
          Swop is an app for people who need one place to point everyone to.
          Instead of keeping a link-in-bio page in one service, a payment link
          in another, and a scheduling tool in a third, Swop puts your page,
          your wallet, your storefront, and your booking calendar behind a
          single link that you own.
        </p>
        <p>
          It is built for creators, freelancers, and small businesses who get
          paid directly by the people they work with — and it is{" "}
          <b className="font-semibold text-gray-950">self-custody</b>, meaning
          the crypto in your wallet belongs to you and Swop cannot move, hold,
          or freeze it. Swop is available on the web and as an iOS and Android
          app.
        </p>
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

      {/* how it works */}
      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em] text-gray-950">
        How it works
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="flex gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-950 font-mono text-[12px] font-bold text-white">
              {s.n}
            </span>
            <span>
              <h3 className="text-[15px] font-bold text-gray-950">{s.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-gray-600">
                {s.body}
              </p>
            </span>
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
          Google Calendar. Connecting is optional — every other part of Swop
          works without it — and Swop uses that access for two things only:
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
              dashboard. This information is shown only to you — never to
              visitors, who see only which slots are free.
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
          <a
            href={PRIVACY_URL}
            className="font-semibold text-gray-950 underline"
          >
            Privacy Policy
          </a>{" "}
          for full detail.
        </p>
      </div>

      {/* footer */}
      <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/[0.06] pt-6 text-[13px] text-gray-500">
        <span className="font-semibold text-gray-950">Swop</span>
        <a href={PRIVACY_URL} className="text-gray-500 no-underline">
          Privacy Policy
        </a>
        <a href={TERMS_URL} className="text-gray-500 no-underline">
          Terms of Service
        </a>
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
