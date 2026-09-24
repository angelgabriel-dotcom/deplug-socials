import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MdArrowBack, MdCheckCircle, MdLock, MdReceiptLong, MdShield } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/checkout.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatNaira } from '../lib/money';

function Checkout() {
  const { accountId } = useParams();
  const { user, token } = useAuth();

  const [account, setAccount] = useState(() => accounts.find((item) => item.id === Number(accountId)) || null);
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Fetch fresh listing state from backend
  useEffect(() => {
    let active = true;
    api.getListing(accountId)
      .then(({ listing }) => {
        if (active && listing) setAccount(listing);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [accountId]);

  if (!account) {
    return (
      <main className="checkout-missing">
        <h1>Listing not found</h1>
        <p>The requested account listing could not be found.</p>
        <Link to="/browse">Back to browse</Link>
      </main>
    );
  }

  const meta = platformMeta[account.platform] || { color: '#6c63ff', icon: MdReceiptLong };
  const PlatformIcon = meta.icon;
  const isAlreadySold = account.status !== 'published';

  const completeOrder = async () => {
    if (!contactName.trim() || !contactEmail.trim()) {
      setError('Please provide your full name and a valid email address.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contactEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsProcessing(true);

    if (!user || !token) {
      setError('Please log in before continuing to secure payment.');
      setIsProcessing(false);
      return;
    }

    try {
      const response = await api.initializePaystack({
        listingId: account.id,
        contactName: contactName.trim(),
      }, token);
      window.location.assign(response.authorizationUrl);
    } catch (requestError) {
      setError(requestError.message || 'Unable to complete order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <Link className="back-link" to={`/account/${account.id}`}><MdArrowBack /> Back to listing</Link>
        <div className="checkout-heading">
          <div>
            <p className="eyebrow">Secure checkout</p>
            <h1>Complete your order</h1>
            <p>Complete your purchase to receive instant access to account credentials and transfer guidance.</p>
          </div>
          <span className="checkout-lock"><MdLock /> Protected checkout</span>
        </div>

        {!user && (
          <div className="checkout-auth-banner">
            <span>Please log in before payment so your verified order is securely linked to your dashboard.</span>
            <Link to="/login">Log In</Link>
          </div>
        )}

        {isAlreadySold && (
          <div className="checkout-error">
            {account.status === 'sold' ? 'This account has already been purchased and is no longer available.' : 'This account is temporarily reserved while another payment is being completed.'}
          </div>
        )}

        {error && <div className="checkout-error">{error}</div>}

        <div className="checkout-layout">
          <section className="checkout-form-card">
            <div className="checkout-step">
              <span>1</span>
              <div>
                <h2>Contact information</h2>
                <p>Where should we send order updates and access receipts?</p>
              </div>
            </div>
            <div className="checkout-fields">
              <label>
                Email address
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={isProcessing || isAlreadySold}
                />
              </label>
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Your full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={isProcessing || isAlreadySold}
                />
              </label>
            </div>

            <div className="checkout-step payment-step">
              <span>2</span>
              <div>
                <h2>Choose payment at Paystack</h2>
                <p>Paystack will securely show the payment methods enabled for this store.</p>
              </div>
            </div>

            <button
              className="complete-order-button"
              type="button"
              onClick={completeOrder}
              disabled={isProcessing || isAlreadySold || !user}
            >
              {isProcessing
                ? 'Processing payment...'
                : isAlreadySold
                ? 'Account Sold'
                : !user
                ? 'Log in to pay securely'
                : `Continue to Paystack · ${formatNaira(account.price)}`}
            </button>
            <p className="checkout-disclaimer">
              <MdShield /> Transactions are verified before credential handover.
            </p>
          </section>

          <aside className="order-summary">
            <div className="summary-heading">
              <h2>Order summary</h2>
              <MdReceiptLong />
            </div>
            <div className="summary-account">
              <div className="summary-avatar" style={{ background: `${meta.color}20`, color: meta.color }}>
                <PlatformIcon />
              </div>
              <div>
                <span>{account.platform} · {account.category}</span>
                <h3>{account.title}</h3>
                <p>{account.handle}</p>
              </div>
            </div>
            <div className="summary-lines">
              <div>
                <span>Account</span>
                <strong>{formatNaira(account.price)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong className="free-delivery">Instant</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{formatNaira(account.price)}</strong>
              </div>
            </div>
            <div className="summary-note">
              <MdCheckCircle />
              <span>Full account ownership and login credentials delivered upon payment.</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Checkout;
