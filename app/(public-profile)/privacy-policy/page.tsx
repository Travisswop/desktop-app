import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Swop",
  description:
    "How Swop collects, uses, and protects your information, including data received from Google APIs.",
};

const EFFECTIVE_DATE = "July 30, 2026";

/**
 * Public privacy policy — linked from the Google OAuth consent screen and
 * app-store listings. The "Google user data" section satisfies the Google API
 * Services User Data Policy (including Limited Use) for the Calendar template.
 */
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-14">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-gray-950">
        Privacy Policy
      </h1>
      <p className="mt-1 text-[13px] text-gray-500">
        Effective {EFFECTIVE_DATE} · Swop (&ldquo;Swop&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;)
      </p>

      <div className="mt-8 flex flex-col gap-8 text-[15px] leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            1. What Swop is
          </h2>
          <p>
            Swop is a self-custody platform for digital identity and payments:
            you create a public SmartSite, manage crypto wallets you control,
            and sell or accept payments. We never hold your funds and never
            have access to your private keys.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            2. Information we collect
          </h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <b>Account information</b> — name, email address, and profile
              details you provide when you sign up or edit your SmartSite.
            </li>
            <li>
              <b>Wallet addresses</b> — the public blockchain addresses linked
              to your account. Blockchain transactions are public by design.
            </li>
            <li>
              <b>Content you publish</b> — anything you place on your public
              SmartSite is public.
            </li>
            <li>
              <b>Visitor submissions</b> — when a visitor fills a form or books
              a meeting on someone&rsquo;s SmartSite, we collect what they enter
              (such as name and email) and deliver it to that SmartSite&rsquo;s
              owner.
            </li>
            <li>
              <b>Usage and device data</b> — logs, IP address, and analytics
              used to operate and secure the service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            3. Google user data (Calendar template)
          </h2>
          <p>
            If you connect Google Calendar to power the Calendar template on
            your SmartSite, Swop accesses your Google data strictly to run that
            feature:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <b>What we access</b> — your Google account email address (to
              show which account is connected), free/busy information from
              your calendar (to compute open time slots), and permission to
              create calendar events (to add a booking, with a Google Meet
              link, when a visitor books).
            </li>
            <li>
              <b>What we store</b> — encrypted OAuth tokens, your Google
              account email, and the bookings created through Swop. We do not
              store the contents of your calendar: event titles, attendees,
              and details of your existing events never leave the availability
              computation.
            </li>
            <li>
              <b>What we never do</b> — we do not sell Google user data, do
              not use it for advertising, do not transfer it to third parties
              except as necessary to provide the feature (or for security or
              legal compliance), and humans do not read it except with your
              permission, for security, or to comply with law.
            </li>
            <li>
              <b>Revoking access</b> — disconnect at any time from your
              SmartSite editor, or from your Google Account at{" "}
              <a
                className="underline"
                href="https://myaccount.google.com/permissions"
              >
                myaccount.google.com/permissions
              </a>
              . Disconnecting deletes our stored tokens.
            </li>
          </ul>
          <p className="mt-2">
            Swop&rsquo;s use and transfer of information received from Google
            APIs adheres to the{" "}
            <a
              className="underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            4. How we use information
          </h2>
          <p>
            To provide and improve the service, process payments you initiate,
            deliver notifications you request, prevent fraud and abuse, and
            comply with legal obligations. We do not sell your personal
            information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            5. Sharing
          </h2>
          <p>
            We share data only with service providers that operate the platform
            for us (cloud hosting, email delivery, media storage, payment
            processing), when you direct us to (for example, a booking is
            shared with the SmartSite owner you booked), and where required by
            law. Public blockchains are public; anything you publish to your
            SmartSite is public.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            6. Security &amp; retention
          </h2>
          <p>
            Sensitive credentials (including Google OAuth tokens) are encrypted
            at rest, and access is limited to systems that need it. We retain
            data while your account is active or as needed to provide the
            service; you can request deletion of your account and associated
            data at any time from account settings or by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            7. Your choices
          </h2>
          <p>
            You can access, update, or delete your account information, revoke
            connected integrations, and control notification preferences in
            the app. Depending on where you live, you may have additional
            rights (such as access, portability, correction, and deletion) —
            contact us to exercise them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            8. Children
          </h2>
          <p>
            Swop is not directed to children under 13 (or the equivalent
            minimum age in your jurisdiction), and we do not knowingly collect
            their data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            9. Changes &amp; contact
          </h2>
          <p>
            We will post any changes to this policy here and update the
            effective date. Questions or requests:{" "}
            <a className="underline" href="mailto:support@swopme.co">
              support@swopme.co
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
