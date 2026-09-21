import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdCheckCircle,
  MdChevronRight,
  MdContentCopy,
  MdEdit,
  MdInventory2,
  MdLock,
  MdLockOpen,
  MdPerson,
  MdReceiptLong,
  MdSave,
  MdShoppingBag,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/dashboard.css';
import '../styles/dashboard-profile.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const navItems = [
  { id: 'overview', label: 'Overview', icon: MdInventory2 },
  { id: 'orders', label: 'Orders', icon: MdReceiptLong },
  { id: 'profile', label: 'Profile settings', icon: MdPerson },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, token, updateUser } = useAuth();
  const [profile, setProfile] = useState(() => ({ name: user?.name || '', email: user?.email || '', username: user?.username || '' }));
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Sync profile state when user changes
  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, email: user.email, username: user.username });
    }
  }, [user]);

  // Fetch live orders for the user from backend
  useEffect(() => {
    if (!token) return;
    let active = true;
    api.getMyOrders(token)
      .then((res) => {
        if (active && res?.orders) setOrders(res.orders);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => { active = false; };
  }, [token]);

  const handleSave = async () => {
    setProfileError('');
    try {
      const { user: updatedUser } = await api.updateProfile(token, profile.name, profile.username);
      updateUser(updatedUser);
      setProfile({ name: updatedUser.name, email: updatedUser.email, username: updatedUser.username });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) { setProfileError(error.message); }
  };

  const showOrders = () => setActiveTab('orders');

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-user">
            <div className="user-avatar">{initials(profile.name || user?.name || 'User')}</div>
            <div>
              <strong>{profile.name || user?.name}</strong>
              <span>{user?.role === 'admin' ? 'Admin account' : 'Buyer account'}</span>
            </div>
          </div>
          <nav className="dashboard-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  className={activeTab === item.id ? 'active' : ''}
                  onClick={() => setActiveTab(item.id)}
                  key={item.id}
                >
                  <Icon /> {item.label}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-help">
            <MdLock />
            <p><strong>Secure Handover</strong>Purchased credentials are protected and viewable only by you.</p>
          </div>
        </aside>

        <section className="dashboard-content">
          {activeTab === 'overview' && (
            <Overview
              name={profile.name || user?.name || 'Buyer'}
              orders={orders}
              loading={loadingOrders}
              onShowOrders={showOrders}
            />
          )}
          {activeTab === 'orders' && <Orders orders={orders} loading={loadingOrders} />}
          {activeTab === 'profile' && (
            <Profile
              profile={profile}
              setProfile={setProfile}
              saved={saved}
              error={profileError}
              onSave={handleSave}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function initials(name) {
  if (!name) return 'DS';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Overview({ name, orders, loading, onShowOrders }) {
  const deliveredCount = useMemo(() => orders.filter((o) => (o.status || '').toLowerCase() === 'delivered').length, [orders]);
  const totalAmount = useMemo(() => orders.reduce((sum, o) => sum + (o.total || 0), 0), [orders]);

  const deliveredOrdersWithCredentials = useMemo(
    () => orders.filter((o) => (o.status || '').toLowerCase() === 'delivered' && o.credentials),
    [orders]
  );

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Buyer dashboard</p>
          <h1>Welcome back, {name.split(' ')[0]}.</h1>
          <p>Track your orders, view account credentials, and manage your account in one place.</p>
        </div>
        <Link to="/browse"><MdShoppingBag /> Browse accounts</Link>
      </header>

      <div className="dashboard-stats">
        <div>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
          <small>Purchased accounts</small>
        </div>
        <div>
          <span>Delivered</span>
          <strong>{deliveredCount}</strong>
          <small className="positive">Ready for takeover</small>
        </div>
        <div>
          <span>Order total</span>
          <strong>${totalAmount.toFixed(2)}</strong>
          <small>Total spent</small>
        </div>
      </div>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Your latest purchases and handover state.</p>
          </div>
          <button type="button" onClick={onShowOrders}>View all <MdChevronRight /></button>
        </div>
        <OrderTable orders={orders.slice(0, 3)} loading={loading} />
      </section>

      <section className="dashboard-panel account-access-panel">
        <div className="panel-heading">
          <div>
            <h2>Purchased account access</h2>
            <p>Reveal credentials and takeover instructions for your delivered accounts.</p>
          </div>
        </div>

        {deliveredOrdersWithCredentials.length > 0 ? (
          <div className="credentials-list">
            {deliveredOrdersWithCredentials.map((order) => (
              <CredentialCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="empty-credentials">
            <h3>No delivered accounts yet</h3>
            <p>Once your order is confirmed, login credentials and takeover instructions will appear here.</p>
            <Link to="/browse">Browse Marketplace</Link>
          </div>
        )}
      </section>
    </>
  );
}

function CredentialCard({ order }) {
  const [revealed, setRevealed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const meta = platformMeta[order.platform] || { color: '#6c63ff', icon: MdInventory2 };
  const PlatformIcon = meta.icon;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1500);
  };

  return (
    <article className="credential-card">
      <div className="credential-card-top">
        <div className="credential-account-info">
          <span className="credential-platform-badge" style={{ color: meta.color, background: `${meta.color}18` }}>
            <PlatformIcon />
          </span>
          <div>
            <strong>{order.title}</strong>
            <span>{order.platform} · {order.handle} · Ref: {order.id}</span>
          </div>
        </div>
        <button
          type="button"
          className="credential-reveal-btn"
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? <><MdLockOpen /> Hide credentials</> : <><MdLock /> Reveal credentials</>}
        </button>
      </div>

      {revealed && order.credentials && (
        <div className="credential-details-grid">
          <div className="credential-field">
            <span>Login / Username</span>
            <div className="credential-value-row">
              <code>{order.credentials.login || 'N/A'}</code>
              <button
                type="button"
                className="credential-copy-btn"
                title="Copy login"
                onClick={() => copyToClipboard(order.credentials.login, 'login')}
              >
                {copiedKey === 'login' ? <small>Copied!</small> : <MdContentCopy />}
              </button>
            </div>
          </div>

          <div className="credential-field">
            <span>Password</span>
            <div className="credential-value-row">
              <code>{showPassword ? order.credentials.password : '••••••••••••'}</code>
              <div className="credential-actions">
                <button
                  type="button"
                  className="credential-copy-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
                <button
                  type="button"
                  className="credential-copy-btn"
                  title="Copy password"
                  onClick={() => copyToClipboard(order.credentials.password, 'password')}
                >
                  {copiedKey === 'password' ? <small>Copied!</small> : <MdContentCopy />}
                </button>
              </div>
            </div>
          </div>

          <div className="credential-field">
            <span>Recovery Email</span>
            <div className="credential-value-row">
              <code>{order.credentials.recoveryEmail || 'None assigned'}</code>
              {order.credentials.recoveryEmail && (
                <button
                  type="button"
                  className="credential-copy-btn"
                  title="Copy recovery email"
                  onClick={() => copyToClipboard(order.credentials.recoveryEmail, 'recovery')}
                >
                  {copiedKey === 'recovery' ? <small>Copied!</small> : <MdContentCopy />}
                </button>
              )}
            </div>
          </div>

          {order.credentials.transferNotes && (
            <div className="credential-notes">
              <strong>Transfer instructions:</strong> {order.credentials.transferNotes}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Orders({ orders, loading }) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Order history</p>
          <h1>Your orders</h1>
          <p>Review each purchase and its delivery status.</p>
        </div>
      </header>
      <section className="dashboard-panel">
        <OrderTable orders={orders} loading={loading} />
      </section>
    </>
  );
}

function OrderTable({ orders, loading }) {
  if (loading) {
    return <div className="orders-table" style={{ padding: '1.5rem', textAlign: 'center' }}><p>Loading orders...</p></div>;
  }

  if (!orders.length) {
    return (
      <div className="orders-table" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p>No orders found.</p>
        <Link to="/browse" style={{ display: 'inline-block', marginTop: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
          Browse available accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="orders-table">
      {orders.map((order) => {
        const fallback = accounts.find((item) => item.id === order.accountId) || {};
        const platform = order.platform || fallback.platform || 'Social';
        const meta = platformMeta[platform] || { color: '#6c63ff', icon: MdInventory2 };
        const Icon = meta.icon;
        const statusClass = (order.status || 'processing').toLowerCase();

        return (
          <div className="order-row" key={order.id}>
            <div className="order-account">
              <span className="order-platform" style={{ color: meta.color, background: `${meta.color}18` }}>
                <Icon />
              </span>
              <div>
                <strong>{order.title || fallback.title || 'Account purchase'}</strong>
                <span>{platform} · {order.handle || fallback.handle || ''}</span>
              </div>
            </div>
            <span className="order-reference">{order.id}</span>
            <span className="order-date">{order.date}</span>
            <strong className="order-total">${order.total}</strong>
            <span className={`order-status ${statusClass}`}>
              <MdCheckCircle /> {order.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Profile({ profile, setProfile, saved, error, onSave }) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile settings</h1>
          <p>Update the personal details used for order notifications.</p>
        </div>
      </header>
      <section className="dashboard-panel profile-panel">
        <div className="profile-intro">
          <div className="large-user-avatar">{initials(profile.name)}</div>
          <div>
            <h2>{profile.name}</h2>
            <p>Authenticated buyer account</p>
          </div>
          <button type="button" disabled><MdEdit /> Avatar soon</button>
        </div>
        <div className="profile-fields">
          <label>
            Full name
            <input
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </label>
          <label>
            Username
            <input
              value={profile.username}
              onChange={(event) => setProfile({ ...profile, username: event.target.value })}
            />
          </label>
          <label className="full-field">
            Email address
            <input type="email" value={profile.email} readOnly />
            <small>Email address linked to your purchases and orders.</small>
          </label>
        </div>
        <div className="profile-save-row">
          <span>
            {saved && <><MdCheckCircle /> Changes saved</>}
            {error && <b className="profile-error">{error}</b>}
          </span>
          <button type="button" onClick={onSave}><MdSave /> Save changes</button>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
