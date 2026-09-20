import { Link, useParams } from 'react-router-dom';
import { MdArrowBack, MdCheckCircle, MdContentCopy, MdLock, MdSchedule, MdShield, MdStar } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/account-details.css';

const deliveryPoints = [
  'Secure credential handover after payment confirmation',
  'Account metrics are reviewed before a listing is published',
  'Dedicated support for the transfer process',
];

function AccountDetails() {
  const { accountId } = useParams();
  const account = accounts.find((item) => item.id === Number(accountId));

  if (!account) {
    return <main className="account-not-found"><h1>Account not found</h1><p>This test listing may no longer be available.</p><Link to="/browse">Back to browse</Link></main>;
  }

  const meta = platformMeta[account.platform];
  const PlatformIcon = meta.icon;

  return (
    <main className="account-detail-page">
      <div className="detail-container">
        <Link className="back-link" to="/browse"><MdArrowBack /> Back to accounts</Link>
        <p className="test-data-notice">Preview mode — this listing uses test data only.</p>

        <div className="detail-layout">
          <section className="detail-main">
            <div className="detail-hero-card">
              <div className="detail-hero-top">
                <span className="platform-chip" style={{ color: meta.color, borderColor: `${meta.color}55` }}><PlatformIcon /> {account.platform}</span>
                {account.verified && <span className="verified-label"><MdCheckCircle /> Verified listing</span>}
              </div>
              <div className="detail-identity">
                <div className="detail-avatar" style={{ background: `${meta.color}20`, color: meta.color }}><PlatformIcon /></div>
                <div><p className="detail-category">{account.category}</p><h1>{account.title}</h1><p className="detail-handle">{account.handle}</p></div>
              </div>
              <div className="detail-stat-grid">
                <div><span>Followers</span><strong>{account.followers}</strong></div>
                <div><span>Engagement</span><strong>{account.engagement}</strong></div>
                <div><span>Account age</span><strong>{account.age}</strong></div>
                <div><span>Audience</span><strong>Global</strong></div>
              </div>
            </div>

            <section className="detail-section"><h2>About this account</h2><p>This {account.platform} {account.category.toLowerCase()} profile is a sample marketplace listing. The final platform will show approved account information, performance history, and disclosure details here.</p></section>
            <section className="detail-section"><h2>Listing details</h2><div className="details-list"><div><span>Platform</span><strong>{account.platform}</strong></div><div><span>Primary category</span><strong>{account.category}</strong></div><div><span>Account age</span><strong>{account.age}</strong></div><div><span>Delivery</span><strong>Instant after confirmation</strong></div></div></section>
          </section>

          <aside className="purchase-panel">
            <div className="price-row"><div><span>One-time purchase</span><strong>${account.price}</strong></div><span className="availability"><MdCheckCircle /> Available</span></div>
            <div className="purchase-divider" />
            <ul className="delivery-list">{deliveryPoints.map((point) => <li key={point}><MdShield /> <span>{point}</span></li>)}</ul>
            <Link className="purchase-button" to={`/checkout/${account.id}`}>Continue to checkout</Link>
            <p className="purchase-caption"><MdLock /> Test checkout — no payment is collected.</p>
          </aside>
        </div>

        <section className="detail-reassurance">
          <div><MdStar /><div><h2>Reviewed listing</h2><p>Key details are shown before purchase.</p></div></div>
          <div><MdSchedule /><div><h2>Fast delivery</h2><p>Delivery status appears in your dashboard.</p></div></div>
          <div><MdContentCopy /><div><h2>Clear transfer steps</h2><p>Guidance is provided during handover.</p></div></div>
        </section>
      </div>
    </main>
  );
}

export default AccountDetails;
