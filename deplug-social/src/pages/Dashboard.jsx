import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdChevronRight, MdEdit, MdInventory2, MdLock, MdPerson, MdReceiptLong, MdSave, MdShoppingBag } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/dashboard.css';

const orders = [
  { id: 'TEST-0001-2026', accountId: 1, date: 'Sep 20, 2026', total: 149, status: 'Delivered' },
  { id: 'TEST-0002-2026', accountId: 4, date: 'Sep 18, 2026', total: 95, status: 'Processing' },
];

const navItems = [
  { id: 'overview', label: 'Overview', icon: MdInventory2 },
  { id: 'orders', label: 'Orders', icon: MdReceiptLong },
  { id: 'profile', label: 'Profile settings', icon: MdPerson },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState({ name: 'Alex Morgan', email: 'alex@example.com', username: 'alexmorgan' });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const showOrders = () => setActiveTab('orders');

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-user"><div className="user-avatar">AM</div><div><strong>{profile.name}</strong><span>Buyer account</span></div></div>
          <nav className="dashboard-nav">{navItems.map((item) => { const Icon = item.icon; return <button type="button" className={activeTab === item.id ? 'active' : ''} onClick={() => setActiveTab(item.id)} key={item.id}><Icon /> {item.label}</button>; })}</nav>
          <div className="sidebar-help"><MdLock /><p><strong>Test dashboard</strong>Everything shown here is frontend sample data.</p></div>
        </aside>

        <section className="dashboard-content">
          {activeTab === 'overview' && <Overview name={profile.name} orders={orders} onShowOrders={showOrders} />}
          {activeTab === 'orders' && <Orders orders={orders} />}
          {activeTab === 'profile' && <Profile profile={profile} setProfile={setProfile} saved={saved} onSave={handleSave} />}
        </section>
      </div>
    </main>
  );
}

function Overview({ name, orders: userOrders, onShowOrders }) {
  return <><header className="dashboard-header"><div><p className="eyebrow">Buyer dashboard</p><h1>Welcome back, {name.split(' ')[0]}.</h1><p>Track test orders and manage your account in one place.</p></div><Link to="/browse"><MdShoppingBag /> Browse accounts</Link></header>
    <div className="dashboard-stats"><div><span>Total orders</span><strong>{userOrders.length}</strong><small>All time</small></div><div><span>Delivered</span><strong>1</strong><small className="positive">Successfully transferred</small></div><div><span>Order total</span><strong>$244</strong><small>Test purchases</small></div></div>
    <section className="dashboard-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest test purchases and delivery status.</p></div><button type="button" onClick={onShowOrders}>View all <MdChevronRight /></button></div><OrderTable orders={userOrders.slice(0, 2)} /></section>
    <section className="dashboard-panel account-access-panel"><div className="panel-heading"><div><h2>Purchased account access</h2><p>Access will be protected and available only after backend delivery is connected.</p></div></div><div className="locked-access"><MdLock /><div><strong>Credential delivery is locked in preview mode</strong><p>The completed version will display each purchased account here, with controlled reveal and transfer guidance.</p></div></div></section>
  </>;
}

function Orders({ orders: userOrders }) {
  return <><header className="dashboard-header"><div><p className="eyebrow">Order history</p><h1>Your orders</h1><p>Review each test purchase and its current delivery state.</p></div></header><section className="dashboard-panel"><OrderTable orders={userOrders} /></section></>;
}

function OrderTable({ orders: userOrders }) {
  return <div className="orders-table">{userOrders.map((order) => { const account = accounts.find((item) => item.id === order.accountId); const meta = platformMeta[account.platform]; const Icon = meta.icon; return <div className="order-row" key={order.id}><div className="order-account"><span className="order-platform" style={{ color: meta.color, background: `${meta.color}18` }}><Icon /></span><div><strong>{account.title}</strong><span>{account.platform} · {account.handle}</span></div></div><span className="order-reference">{order.id}</span><span className="order-date">{order.date}</span><strong className="order-total">${order.total}</strong><span className={`order-status ${order.status.toLowerCase()}`}><MdCheckCircle /> {order.status}</span></div>; })}</div>;
}

function Profile({ profile, setProfile, saved, onSave }) {
  return <><header className="dashboard-header"><div><p className="eyebrow">Account</p><h1>Profile settings</h1><p>Update the personal details used for order notifications.</p></div></header><section className="dashboard-panel profile-panel"><div className="profile-intro"><div className="large-user-avatar">AM</div><div><h2>{profile.name}</h2><p>Member since September 2026 · Test account</p></div><button type="button"><MdEdit /> Change avatar</button></div><div className="profile-fields"><label>Full name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Username<input value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} /></label><label className="full-field">Email address<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label></div><div className="profile-save-row"><span>{saved && <><MdCheckCircle /> Changes saved for this preview</>}</span><button type="button" onClick={onSave}><MdSave /> Save changes</button></div></section></>;
}

export default Dashboard;
