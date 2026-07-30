import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Swop",
  description: "The terms that govern your use of Swop.",
};

const EFFECTIVE_DATE = "July 30, 2026";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-14">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-gray-950">
        Terms of Service
      </h1>
      <p className="mt-1 text-[13px] text-gray-500">
        Effective {EFFECTIVE_DATE} · Swop (&ldquo;Swop&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;)
      </p>

      <div className="mt-8 flex flex-col gap-8 text-[15px] leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            1. Agreement
          </h2>
          <p>
            By creating an account or using Swop you agree to these Terms and
            to our{" "}
            <a className="underline" href="/privacy-policy">
              Privacy Policy
            </a>
            . If you do not agree, do not use the service. You must be at least
            18 to use payment and wallet features.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            2. Self-custody
          </h2>
          <p>
            Swop is a self-custody platform. You alone control your wallets and
            private keys; we cannot access, freeze, or recover your funds.
            Blockchain transactions are irreversible — verify everything before
            you sign. You are responsible for the security of your devices and
            authentication methods.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            3. Your content and conduct
          </h2>
          <p>
            You own what you publish on your SmartSite and are responsible for
            it. You may not use Swop for anything unlawful, deceptive, or
            infringing; to distribute malware; to harass others; or to evade
            sanctions or financial-crime laws. We may remove content or suspend
            accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            4. Payments, sales, and bookings
          </h2>
          <p>
            When you sell products, accept payments, or take bookings through
            Swop, the transaction is between you and your buyer or visitor; you
            are responsible for delivering what you offer and for applicable
            taxes. Third-party services you connect (such as Google Calendar or
            payment processors) are governed by their own terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            5. Digital assets
          </h2>
          <p>
            Digital assets are volatile and may lose value. Nothing on Swop is
            investment, legal, or tax advice. Features that rely on third-party
            networks and markets may be unavailable, delayed, or changed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            6. Intellectual property
          </h2>
          <p>
            Swop, its logo, and the service&rsquo;s software and design are our
            property. We grant you a limited, revocable, non-transferable
            license to use the service. Feedback you send us may be used
            without obligation.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            7. Disclaimers and liability
          </h2>
          <p>
            The service is provided &ldquo;as is&rdquo; without warranties of
            any kind. To the maximum extent permitted by law, Swop is not
            liable for indirect, incidental, special, or consequential damages,
            or for loss of funds, profits, or data arising from your use of the
            service, and our total liability is limited to the greater of $100
            or the amounts you paid us in the twelve months before the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            8. Termination
          </h2>
          <p>
            You can stop using Swop and delete your account at any time. We may
            suspend or terminate access for violations of these Terms or to
            comply with law. Self-custodied assets remain yours regardless.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[18px] font-bold text-gray-950">
            9. Changes, governing law, contact
          </h2>
          <p>
            We may update these Terms; material changes will be posted here
            with a new effective date, and continued use means acceptance.
            These Terms are governed by the laws of the State of Delaware,
            United States, without regard to conflict-of-law rules. Questions:{" "}
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
