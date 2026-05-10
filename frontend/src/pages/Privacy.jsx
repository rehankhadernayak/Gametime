import { Link } from 'react-router-dom';
import { TypewriterHeading } from '../components/ui/TypewriterHeading.jsx';
import './auth-brutal.css';

export default function Privacy() {
  return (
    <div className="auth-brutal-shell auth-brutal-ascii-bg brutal-stub-page">
      <div className="brutal-stub-inner brutal-stub-inner--legal">
        <TypewriterHeading className="font-mono text-xs sm:text-sm mb-4 block text-black">
          PRIVACY_POLICY
        </TypewriterHeading>
        <p className="legal-static-meta">Effective date · Singapore · PDPA</p>
        <article className="legal-static-prose">
          <h2>Overview</h2>
          <p>
            Gametime (“we”, “us”) operates a family app that connects parents and children around chores, homework,
            rewards, and gaming time. This policy describes how we collect, use, store, and disclose personal data
            when you use our website and services.
          </p>

          <h2>Data we collect</h2>
          <ul>
            <li>
              <strong>Account &amp; contact:</strong> name, email address, and authentication credentials you provide
              when registering or signing in.
            </li>
            <li>
              <strong>Family &amp; task data:</strong> tasks you create, submissions, messages related to chores and
              homework, and reward activity inside the product.
            </li>
            <li>
              <strong>Evidence &amp; media:</strong> photos or videos you or your child upload as proof of completed
              tasks, processed to operate the service and (where enabled) for automated review.
            </li>
            <li>
              <strong>Technical data:</strong> device or browser type, approximate timestamps, and diagnostic logs used
              to secure and improve the service.
            </li>
          </ul>

          <h2>How we use data</h2>
          <p>
            We use personal data to provide and improve Gametime, authenticate users, deliver notifications you opt
            into, operate rewards and partner integrations (such as gift card fulfilment where enabled), comply with
            law, and protect the security and integrity of our systems.
          </p>

          <h2>Legal basis &amp; PDPA</h2>
          <p>
            We collect and process personal data in line with the Personal Data Protection Act 2012 (PDPA) of
            Singapore. Where consent is required, we seek it at collection or through in-product controls. You may
            withdraw consent where applicable, subject to reasonable notice and any consequences described at that time.
          </p>

          <h2>Retention &amp; security</h2>
          <p>
            We retain data only as long as needed for the purposes above or as required by law, then delete or
            anonymise it in line with our retention practices. We apply administrative, technical, and organisational
            measures designed to protect personal data from unauthorised access or disclosure.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on applicable law, you may request access to, correction of, or deletion of your personal data,
            object to certain processing, or lodge a concern with a supervisory authority. To exercise these rights in
            relation to Gametime, contact us using the details on our{' '}
            <Link to="/support">support page</Link>.
          </p>

          <h2>International transfers</h2>
          <p>
            Where we use service providers outside Singapore, we take steps designed to ensure your data receives a
            comparable level of protection, including contractual safeguards where appropriate.
          </p>

          <h2>Updates</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated through the product or
            by email where appropriate. Continued use after changes means you accept the updated policy.
          </p>
        </article>
        <p className="legal-static-back">
          <Link to="/" className="brutal-stub-link">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
