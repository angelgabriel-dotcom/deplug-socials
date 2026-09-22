import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MdCheckCircle, MdErrorOutline, MdLock } from 'react-icons/md';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../styles/payment-verify.css';

function PaymentVerify() {
  const [params] = useSearchParams();
  const { token, user, loading } = useAuth();
  const [state, setState] = useState({ status: 'verifying', message: 'Confirming your payment securely with Paystack.', order: null });
  const reference = params.get('reference') || params.get('trxref');

  useEffect(() => {
    if (loading || !reference || !user || !token) return undefined;
    let active = true;
    api.verifyPaystack(reference, token)
      .then(({ order }) => { if (active) setState({ status: 'success', message: 'Payment verified. Your order is now being prepared for delivery.', order }); })
      .catch((error) => { if (active) setState({ status: 'error', message: error.message, order: null }); });
    return () => { active = false; };
  }, [loading, reference, token, user]);

  const missingMessage = !loading && !reference ? 'No payment reference was provided.' : !loading && (!user || !token) ? 'Please log in to verify this payment.' : null;
  const displayState = missingMessage ? { status: 'error', message: missingMessage, order: null } : state;
  const isSuccess = displayState.status === 'success';
  const isError = displayState.status === 'error';
  return <main className="payment-verify-page"><section className="payment-verify-card"><span className={`payment-state-icon ${isSuccess ? 'success' : isError ? 'error' : ''}`}>{isSuccess ? <MdCheckCircle /> : isError ? <MdErrorOutline /> : <MdLock />}</span><p className="eyebrow">{isSuccess ? 'Payment verified' : isError ? 'Payment needs attention' : 'Secure verification'}</p><h1>{isSuccess ? 'Thank you for your purchase.' : isError ? 'We could not verify this payment.' : 'Verifying your payment…'}</h1><p>{displayState.message}</p>{displayState.order && <div className="verified-order"><span>Order reference</span><strong>{displayState.order.id}</strong></div>}<div className="payment-verify-actions">{isSuccess ? <Link to="/dashboard">View order in dashboard</Link> : <Link to="/browse">Return to browse</Link>}{isError && <Link className="secondary" to="/dashboard">Open dashboard</Link>}</div></section></main>;
}

export default PaymentVerify;
