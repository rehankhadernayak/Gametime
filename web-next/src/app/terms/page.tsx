import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/styles/legal-doc.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Gametime",
  description: "Terms governing use of Gametime, including liability and gift card refunds.",
};

export default function TermsOfServicePage() {
  return (
    <div className={styles.docRoot}>
      <article className={styles.inner}>
        <header className={styles.creamHeader}>
          <p className={styles.eyebrow}>Legal hub</p>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.subMeta}>
            Effective date: May 3, 2026. By accessing or using Gametime, you agree to these terms. If you do not agree,
            do not use the service.
          </p>
          <nav className={styles.navRow} aria-label="Legal navigation">
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            <span className={styles.navSep} aria-hidden="true">
              ·
            </span>
            <Link href="/privacy" className={styles.navLink}>
              Privacy Policy
            </Link>
          </nav>
        </header>

        <div className={styles.body}>
          <section className={styles.section} aria-labelledby="terms-intro-heading">
            <h2 id="terms-intro-heading">Agreement</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of Gametime websites, applications, and
              related services (collectively, the &quot;Service&quot;). The Service is operated for families; a parent
              or legal guardian who registers an account represents that they have authority to bind their household to
              these Terms where applicable.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="acceptable-use-heading">
            <h2 id="acceptable-use-heading">Acceptable use</h2>
            <p>
              You agree to use the Service only for lawful family purposes, to provide accurate information, and not to
              misuse the Service, interfere with other users, or attempt to access data or systems without authorisation.
              You are responsible for activity under your credentials and for supervising how minors in your household
              use the Service.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="disclaimer-heading">
            <h2 id="disclaimer-heading">Disclaimer of liability (phone locking)</h2>
            <p>
              Gametime may offer features intended to help parents manage gaming time, including optional controls that
              interact with device or platform behaviour (for example, reminders, session limits, or companion
              integrations described in the product as restricting or &quot;locking&quot; device use during certain
              periods).
            </p>
            <p className={styles.callout}>
              <strong>To the maximum extent permitted by applicable law,</strong> you acknowledge that phone locking,
              screen-time enforcement, and similar controls depend on device settings, operating system behaviour, third
              parties, and user actions that we do not fully control. Gametime and its suppliers are{" "}
              <strong>not liable</strong> for any loss, damage, inconvenience, missed calls, emergency access issues,
              data loss, hardware malfunction, or any other harm arising from use or failure of these features,
              including when a lock does not engage, disengages unexpectedly, or is bypassed. You use such features at
              your own risk and should maintain alternate ways to reach family members in emergencies.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="refund-heading">
            <h2 id="refund-heading">Refund policy (gift card purchases)</h2>
            <p>
              Gift cards and digital codes fulfilled through Gametime or its payment and fulfilment partners are
              generally treated as <strong>final sale</strong> once delivery to your account or designated recipient
              has begun, because codes can be copied and redeemed.
            </p>
            <p>We may offer a refund or replacement only when:</p>
            <ul className={styles.list}>
              <li>A technical error charged you incorrectly or prevented delivery of a paid item; or</li>
              <li>
                A code was demonstrably invalid before redemption and reported within the timeframe stated in product
                help; or
              </li>
              <li>Required by applicable consumer law in your jurisdiction.</li>
            </ul>
            <p>
              Refund requests must be submitted through the contact method provided in the app. We may require proof of
              purchase and may deny requests where a code has already been revealed, redeemed, or transferred contrary
              to these Terms.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="general-heading">
            <h2 id="general-heading">General</h2>
            <p>
              We may update these Terms from time to time; the effective date at the top will change when we do.
              Continued use of the Service after changes constitutes acceptance of the revised Terms. If any provision
              is held unenforceable, the remainder remains in effect. These Terms are governed by the laws applicable to
              the operating entity identified in your account or checkout flow, without regard to conflict-of-law
              rules, except where mandatory local consumer protections apply.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
