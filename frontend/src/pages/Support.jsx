import { Link } from 'react-router-dom';
import { BrutalistCard } from '../components/ui/BrutalistCard.jsx';
import { TypewriterHeading } from '../components/ui/TypewriterHeading.jsx';
import './auth-brutal.css';

export default function Support() {
  return (
    <div className="auth-brutal-shell auth-brutal-ascii-bg brutal-stub-page">
      <div className="brutal-stub-inner brutal-stub-inner--legal">
        <TypewriterHeading className="font-mono text-xs sm:text-sm mb-4 block text-black">
          SYSTEM_SUPPORT
        </TypewriterHeading>
        <BrutalistCard className="bg-white mb-6">
          <p className="legal-static-prose support-card-section">
            Need help with your account, family setup, or data rights? Send a message from the email address on your
            parent account to <strong>privacy@gametime.app</strong>. Include your registered email and a short
            description of the issue so we can verify and respond.
          </p>
          <h2 className="support-card-heading">Account deletion</h2>
          <p className="legal-static-prose support-card-section">
            To request deletion of your account and associated personal data, email{' '}
            <strong>privacy@gametime.app</strong> from your parent account email with the subject line “Account
            deletion request”. We will confirm identity and process the request in line with applicable law and our
            retention obligations.
          </p>
          <h2 className="support-card-heading">Admin / urgent issues</h2>
          <p className="legal-static-prose support-card-section">
            For security-sensitive reports or operational emergencies, mark your email as urgent and include relevant
            timestamps and screenshots where safe to share.
          </p>
        </BrutalistCard>
        <p className="legal-static-back">
          <Link to="/privacy" className="brutal-stub-link">
            Privacy policy
          </Link>
          {' · '}
          <Link to="/" className="brutal-stub-link">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
