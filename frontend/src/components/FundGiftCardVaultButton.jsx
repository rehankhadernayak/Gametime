import { useState } from 'react';
import { apiRequest } from '../api/client.js';
import './FundGiftCardVaultButton.css';

const AMOUNTS_SGD = [10, 20, 50];

/**
 * Starts Stripe Checkout for parent-funded Amazon gift card vault (manual fulfillment).
 */
export default function FundGiftCardVaultButton({ token, onError }) {
  const [amountSgd, setAmountSgd] = useState(10);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await apiRequest('/api/billing/create-checkout', {
        method: 'POST',
        token,
        body: { amountSgd }
      });
      if (typeof window !== 'undefined' && url) {
        window.location.href = url;
      }
    } catch (err) {
      const msg = err.message || 'Could not start payment. Please try again.';
      if (typeof onError === 'function') onError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="fund-vault-block">
      <h3 className="fund-vault-heading">Fund Amazon gift card vault</h3>
      <p className="helper-text">
        Pay securely with Stripe. We will add Amazon gift cards to your vault after we confirm your payment.
      </p>
      <div className="fund-vault-amount-row">
        {AMOUNTS_SGD.map((amt) => (
          <button
            key={amt}
            type="button"
            className={`fund-vault-amount-btn${amountSgd === amt ? ' fund-vault-amount-btn--active' : ''}`}
            onClick={() => setAmountSgd(amt)}
          >
            S${amt}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-primary fund-vault-pay-btn"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Redirecting…' : 'Fund Gift Card'}
      </button>
      <p className="fund-vault-note">Powered by Stripe · PCI-compliant · No card data stored</p>
    </div>
  );
}
