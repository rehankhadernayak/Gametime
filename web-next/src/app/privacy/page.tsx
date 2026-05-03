import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/styles/legal-doc.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Gametime",
  description: "How Gametime collects, uses, and protects family data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.docRoot}>
      <article className={styles.inner}>
        <header className={styles.creamHeader}>
          <p className={styles.eyebrow}>Legal hub</p>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subMeta}>
            Effective date: May 3, 2026. Gametime (&quot;we&quot;, &quot;us&quot;) explains how we handle information when
            families use our service.
          </p>
          <nav className={styles.navRow} aria-label="Legal navigation">
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            <span className={styles.navSep} aria-hidden="true">
              ·
            </span>
            <Link href="/terms" className={styles.navLink}>
              Terms of Service
            </Link>
          </nav>
        </header>

        <div className={styles.body}>
          <section className={styles.section} aria-labelledby="intro-heading">
            <h2 id="intro-heading">Introduction</h2>
            <p>
              Gametime helps Singapore families align chores, homework, and gaming rewards. This policy describes the
              categories of information we collect, how we use it, and the choices available to parents who create and
              manage accounts on behalf of their households.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="collection-heading">
            <h2 id="collection-heading">Information collection</h2>
            <p>We collect information you and your family provide when using Gametime, including:</p>
            <ul className={styles.list}>
              <li>
                <strong>Family and account details</strong> — Parent full names, email addresses, and household
                identifiers needed to operate accounts, authenticate users, and personalise the parent dashboard.
              </li>
              <li>
                <strong>Child profiles</strong> — Information parents add about children (for example display names or
                ages) to tailor tasks and rewards.
              </li>
              <li>
                <strong>Task evidence</strong> — Photos and videos that children or parents submit as proof of completed
                chores or homework. This content may be processed by automated systems (including vision-assisted
                review) and is visible to the parent account that owns the task.
              </li>
              <li>
                <strong>Usage and device data</strong> — Technical data such as app or browser type, session logs, and
                security signals needed to run the service and prevent abuse.
              </li>
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="usage-heading">
            <h2 id="usage-heading">Data usage</h2>
            <p>We use the information above to:</p>
            <ul className={styles.list}>
              <li>Operate tasks, approvals, rewards, and gaming-time rules for your family.</li>
              <li>
                Improve the family economy inside the product — for example by refining task flows, reward fairness,
                and in-product guidance, including through aggregated or de-identified analytics where permitted.
              </li>
              <li>Maintain security, comply with law, and respond to valid requests from parents or authorities.</li>
            </ul>
            <p>
              We do not sell personal information. We share data only with service providers who help us host and
              deliver the product, under contracts that require appropriate safeguards, or when disclosure is required by
              law.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="children-heading">
            <h2 id="children-heading">Children&apos;s privacy</h2>
            <p>
              Gametime is designed so that <strong>parents create accounts and manage child data</strong>. Children use
              the service under parental direction. We treat child-related information as belonging to the parent
              account, and parents can review or remove content they no longer wish to store, subject to technical and
              legal retention limits.
            </p>
            <p>
              For users in the United States, we comply with the Children&apos;s Online Privacy Protection Act (COPPA)
              by obtaining verifiable parental consent where required, limiting collection to what is reasonably necessary
              to participate in the service, and allowing parents to review, delete, and refuse further collection of
              their child&apos;s personal information as described in our support channels and account tools.
            </p>
            <p className={styles.callout}>
              If you believe we have collected information from a child without appropriate parental involvement, please
              contact us immediately so we can investigate and take appropriate action.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="rights-heading">
            <h2 id="rights-heading">Your rights and contact</h2>
            <p>
              Depending on where you live, you may have rights to access, correct, export, or delete personal data. To
              exercise these rights, contact us through the in-app support or email address shown in your parent account
              settings. We may need to verify the requesting parent before fulfilling sensitive requests.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
