import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MdArrowBack, MdCheckCircle, MdContentCopy, MdLock, MdSchedule, MdShield, MdStar } from 'react-icons/md';
import { accounts as fallbackAccounts, platformMeta } from '../data/accounts';
import '../styles/account-details.css';
import { api } from '../lib/api';

const deliveryPoints = [
  'Secure credential handover after payment confirmation',
  'Account metrics are reviewed before a listing is published',
  'Dedicated support for the transfer process',
];

function AccountDetails() {
  const { accountId } = useParams();
  const [account, setAccount] = useState(() => fallbackAccounts.find((item) => item.id === Number(accountId)) || null);

  useEffect(() => {
    let active = true;
    api.getListing(accountId)
      .then((res) => {
        if (active && res?.listing) setAccount(res.listing);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [accountId]);

  if (!account) {
    return (
      <main className="account-not-found">
        <h1>Account not found</h1>
        <p>This listing may no longer be available or has been removed.</p>
        <Link to="/browse">Back to browse</Link>
      </main>
    );
  }

  const meta = platformMeta[account.platform] || { color: '#6c63ff', icon: MdCheckCircle };
  const PlatformIcon = meta.icon;
  const isSold = account.status === 'sold';
  const paymentPending = account.status === 'payment_pending';
  const unavailable = isSold || paymentPending;

  return (
    <main className="account-detail-page">
      <div className="detail-container">
        <Link className="back-link" to="/browse"><MdArrowBack /> Back to accounts</Link>

        <div className="detail-layout" style={{ marginTop: '1.4rem' }}>
          <section className="detail-main">
            <div className="detail-hero-card">
              <div className="detail-hero-top">
                <span className="platform-chip" style={{ color: meta.color, borderColor: `${meta.color}55` }}>
                  <PlatformIcon /> {account.platform}
                </span>
                {unavailable ? (
                  <span className="availability sold">{isSold ? 'Sold' : 'Payment pending'}</span>
                ) : (
                  account.verified && <span className="verified-label"><MdCheckCircle /> Verified listing</span>
                )}
              </div>
              <div className="detail-identity">
                <div className="detail-avatar" style={{ background: `${meta.color}20`, color: meta.color }}>
                  <PlatformIcon />
                </div>
                <div>
                  <p className="detail-category">{account.category}</p>
                  <h1>{account.title}</h1>
                  <p className="detail-handle">{account.handle}</p>
                </div>
              </div>
              <div className="detail-stat-grid">
                <div><span>Followers</span><strong>{account.followers}</strong></div>
                <div><span>Engagement</span><strong>{account.engagement}</strong></div>
                <div><span>Account age</span><strong>{account.age}</strong></div>
                <div><span>Audience</span><strong>{account.audience || 'Global'}</strong></div>
              </div>
            </div>

            <section className="detail-section">
              <h2>About this account</h2>
              <p>
                {account.description ||
                  `This ${account.platform} ${account.category.toLowerCase()} profile is an active marketplace listing. Approved account details, metrics, and transfer guidance are verified by our team.`}
              </p>
            </section>

            <section className="detail-section">
              <h2>Listing details</h2>
              <div className="details-list">
                <div><span>Platform</span><strong>{account.platform}</strong></div>
                <div><span>Primary category</span><strong>{account.category}</strong></div>
                <div><span>Account age</span><strong>{account.age}</strong></div>
                <div><span>Delivery</span><strong>{isSold ? 'Delivered' : paymentPending ? 'Temporarily reserved' : 'After verified payment'}</strong></div>
              </div>
            </section>
          </section>

          <aside className="purchase-panel">
            <div className="price-row">
              <div>
                <span>One-time purchase</span>
                <strong>${account.price}</strong>
              </div>
              {unavailable ? (
                <span className="availability sold">{isSold ? 'Sold' : 'Payment pending'}</span>
              ) : (
                <span className="availability"><MdCheckCircle /> Available</span>
              )}
            </div>

            <div className="purchase-divider" />
            <ul className="delivery-list">
              {deliveryPoints.map((point) => (
                <li key={point}><MdShield /> <span>{point}</span></li>
              ))}
            </ul>

            {unavailable ? (
              <span className="purchase-button sold">{isSold ? 'Account already sold' : 'Checkout is temporarily in progress'}</span>
            ) : (
              <Link className="purchase-button" to={`/checkout/${account.id}`}>Continue to checkout</Link>
            )}

            <p className="purchase-caption">
              <MdLock /> {isSold ? 'Transferred securely to buyer.' : paymentPending ? 'This listing is temporarily reserved during payment.' : 'Credential handover begins after verified payment.'}
            </p>
          </aside>
        </div>

        <section className="detail-reassurance">
          <div><MdStar /><div><h2>Reviewed listing</h2><p>Key metrics are verified before listing.</p></div></div>
          <div><MdSchedule /><div><h2>Fast delivery</h2><p>Credentials appear instantly in your dashboard.</p></div></div>
          <div><MdContentCopy /><div><h2>Clear transfer steps</h2><p>Step-by-step guidance provided for handover.</p></div></div>
        </section>
      </div>
    </main>
  );
}

export default AccountDetails;
