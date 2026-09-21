import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MdArrowBack, MdCheckCircle, MdCreditCard, MdLock, MdPayments, MdReceiptLong, MdShield } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/checkout.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const paymentMethods = [
  { id: 'card', label: 'Card payment', description: 'Debit or credit card', icon: MdCreditCard },
  { id: 'transfer', label: 'Bank transfer', description: 'Instant transfer confirmation', icon: MdPayments },
];

function Checkout() {
  const { accountId } = useParams();
  const { user, token } = useAuth();

  const [account, setAccount] = useState(() => accounts.find((item) => item.id === Number(accountId)) || null);
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [error, setError] = useState('');

  // Synchronize user profile into contact fields if logged in
  useEffect(() => {
    if (user) {
      setContactName((prev) => prev || user.name || '');
      setContactEmail((prev) => prev || user.email || '');
    }
  }, [user]);

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
  const isAlreadySold = account.status === 'sold';

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

    try {
      const response = await api.createOrder({
        listingId: account.id,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        paymentMethod,
      }, token);

      setCompletedOrder(response.order);
      setIsComplete(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to complete order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete && completedOrder) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <span className="success-icon"><MdCheckCircle /></span>
          <p className="eyebrow">Order Confirmed</p>
          <h1>Payment Successful!</h1>
          <p>
            Your order for <strong>{completedOrder.title}</strong> has been confirmed and the account credentials
            are ready for handover.
          </p>

          <div className="success-order">
            <span>Order reference</span>
            <strong>{completedOrder.id}</strong>
          </div>

          <div className="checkout-success-actions">
            {user ? (
              <Link to="/dashboard" className="primary-link">
                Access Credentials in Dashboard
              </Link>
            ) : (
              <Link to={`/login?email=${encodeURIComponent(contactEmail)}`} className="primary-link">
                Log In to View Credentials
              </Link>
            )}
            <Link to="/browse" className="secondary-link">
              Continue Browsing
            </Link>
          </div>
        </section>
      </main>
    );
  }

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
            <span>Already have a Deplug Social account? Log in to connect this purchase directly to your dashboard.</span>
            <Link to={`/login?redirect=/checkout/${account.id}`}>Log In</Link>
          </div>
        )}

        {isAlreadySold && (
          <div className="checkout-error">
            This account has already been purchased and is no longer available.
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
                <h2>Payment method</h2>
                <p>Select your payment method.</p>
              </div>
            </div>
            <div className="payment-options">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <label
                    className={`payment-option ${paymentMethod === method.id ? 'selected' : ''}`}
                    key={method.id}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      disabled={isProcessing || isAlreadySold}
                    />
                    <Icon />
                    <span>
                      <strong>{method.label}</strong>
                      <small>{method.description}</small>
                    </span>
                    <i />
                  </label>
                );
              })}
            </div>

            <button
              className="complete-order-button"
              type="button"
              onClick={completeOrder}
              disabled={isProcessing || isAlreadySold}
            >
              {isProcessing
                ? 'Processing payment...'
                : isAlreadySold
                ? 'Account Sold'
                : `Complete order · $${account.price}`}
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
                <strong>${account.price}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong className="free-delivery">Instant</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>${account.price}</strong>
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
