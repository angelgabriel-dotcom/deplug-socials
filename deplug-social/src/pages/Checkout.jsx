import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MdArrowBack, MdCheckCircle, MdCreditCard, MdLock, MdPayments, MdReceiptLong, MdShield } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/checkout.css';

const paymentMethods = [
  { id: 'card', label: 'Card payment', description: 'Debit or credit card', icon: MdCreditCard },
  { id: 'transfer', label: 'Bank transfer', description: 'Confirm payment manually', icon: MdPayments },
];

function Checkout() {
  const { accountId } = useParams();
  const account = accounts.find((item) => item.id === Number(accountId));
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (!account) return <main className="checkout-missing"><h1>Listing not found</h1><Link to="/browse">Back to browse</Link></main>;

  const meta = platformMeta[account.platform];
  const PlatformIcon = meta.icon;

  const completeOrder = () => {
    setIsProcessing(true);
    window.setTimeout(() => { setIsProcessing(false); setIsComplete(true); }, 900);
  };

  if (isComplete) {
    return <main className="checkout-page"><section className="checkout-success"><span className="success-icon"><MdCheckCircle /></span><p className="eyebrow">Test order confirmed</p><h1>Your order is ready for processing.</h1><p>No real payment was made. In the live product, order status and delivery information will appear in the buyer dashboard.</p><div className="success-order"><span>Order reference</span><strong>TEST-{String(account.id).padStart(4, '0')}-2026</strong></div><Link to="/browse">Continue browsing</Link></section></main>;
  }

  return <main className="checkout-page">
    <div className="checkout-container">
      <Link className="back-link" to={`/account/${account.id}`}><MdArrowBack /> Back to listing</Link>
      <div className="checkout-heading"><div><p className="eyebrow">Secure checkout</p><h1>Complete your order</h1><p>This is a frontend-only checkout preview. No payment details are sent or stored.</p></div><span className="checkout-lock"><MdLock /> Protected checkout</span></div>

      <div className="checkout-layout">
        <section className="checkout-form-card">
          <div className="checkout-step"><span>1</span><div><h2>Contact information</h2><p>Where should we send order updates?</p></div></div>
          <div className="checkout-fields"><label>Email address<input type="email" placeholder="you@example.com" /></label><label>Full name<input type="text" placeholder="Your full name" /></label></div>
          <div className="checkout-step payment-step"><span>2</span><div><h2>Payment method</h2><p>Select how you want to complete this test order.</p></div></div>
          <div className="payment-options">{paymentMethods.map((method) => { const Icon = method.icon; return <label className={`payment-option ${paymentMethod === method.id ? 'selected' : ''}`} key={method.id}><input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} /><Icon /><span><strong>{method.label}</strong><small>{method.description}</small></span><i /></label>; })}</div>
          <button className="complete-order-button" type="button" onClick={completeOrder} disabled={isProcessing}>{isProcessing ? 'Processing test order...' : `Complete test order · $${account.price}`}</button>
          <p className="checkout-disclaimer"><MdShield /> This preview does not process a real transaction.</p>
        </section>

        <aside className="order-summary">
          <div className="summary-heading"><h2>Order summary</h2><MdReceiptLong /></div>
          <div className="summary-account"><div className="summary-avatar" style={{ background: `${meta.color}20`, color: meta.color }}><PlatformIcon /></div><div><span>{account.platform} · {account.category}</span><h3>{account.title}</h3><p>{account.handle}</p></div></div>
          <div className="summary-lines"><div><span>Account</span><strong>${account.price}</strong></div><div><span>Delivery</span><strong className="free-delivery">Free</strong></div><div className="summary-total"><span>Total</span><strong>${account.price}</strong></div></div>
          <div className="summary-note"><MdCheckCircle /><span>Listing details are confirmed before delivery.</span></div>
        </aside>
      </div>
    </div>
  </main>;
}

export default Checkout;
