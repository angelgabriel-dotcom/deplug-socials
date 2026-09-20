import { useMemo, useState } from 'react';
import { MdAdd, MdAnalytics, MdCheckCircle, MdChevronRight, MdDashboard, MdGroups, MdInventory2, MdMoreHoriz, MdReceiptLong, MdSearch, MdSettings } from 'react-icons/md';
import { accounts, platformMeta } from '../data/accounts';
import '../styles/admin.css';

const orderData = [
  { id: 'TEST-0001-2026', customer: 'Alex Morgan', email: 'alex@example.com', accountId: 1, total: 149, status: 'Delivered', date: 'Sep 20, 2026' },
  { id: 'TEST-0002-2026', customer: 'Taylor Reed', email: 'taylor@example.com', accountId: 4, total: 95, status: 'Processing', date: 'Sep 18, 2026' },
  { id: 'TEST-0003-2026', customer: 'Jordan Lee', email: 'jordan@example.com', accountId: 2, total: 229, status: 'Pending', date: 'Sep 17, 2026' },
];

const adminTabs = [
  { id: 'overview', label: 'Overview', icon: MdDashboard }, { id: 'inventory', label: 'Inventory', icon: MdInventory2 },
  { id: 'orders', label: 'Orders', icon: MdReceiptLong }, { id: 'customers', label: 'Customers', icon: MdGroups },
];

function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  return <main className="admin-page"><div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span>DS</span><div><strong>Deplug Social</strong><small>Admin preview</small></div></div><nav>{adminTabs.map((tab) => { const Icon = tab.icon; return <button type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)} key={tab.id}><Icon /> {tab.label}</button>; })}</nav><div className="admin-sidebar-bottom"><button type="button"><MdAnalytics /> Analytics</button><button type="button"><MdSettings /> Settings</button></div></aside>
    <section className="admin-content"><header className="admin-topbar"><div><p className="eyebrow">Operations</p><h1>{activeTab === 'overview' ? 'Admin overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1></div><span className="admin-preview"><MdCheckCircle /> Test data only</span></header>
      {activeTab === 'overview' && <Overview onTabChange={setActiveTab} />}
      {activeTab === 'inventory' && <Inventory query={query} setQuery={setQuery} />}
      {activeTab === 'orders' && <Orders query={query} setQuery={setQuery} />}
      {activeTab === 'customers' && <Customers />}
    </section>
  </div></main>;
}

function Overview({ onTabChange }) {
  return <><div className="admin-metrics"><Metric label="Listed accounts" value="8" detail="2 added this week" /><Metric label="Pending orders" value="2" detail="Needs review" warning /><Metric label="Test revenue" value="$473" detail="From 3 orders" /><Metric label="Customers" value="3" detail="All test accounts" /></div><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Latest orders that need your attention.</p></div><button type="button" onClick={() => onTabChange('orders')}>View all <MdChevronRight /></button></div><AdminOrders orders={orderData.slice(0, 3)} /></section><section className="admin-panel quick-actions"><div className="admin-panel-heading"><div><h2>Quick actions</h2><p>Common admin workflows for the frontend preview.</p></div></div><button type="button" onClick={() => onTabChange('inventory')}><MdAdd /><span><strong>Add a test listing</strong><small>Create a new inventory draft</small></span><MdChevronRight /></button><button type="button" onClick={() => onTabChange('orders')}><MdReceiptLong /><span><strong>Review pending orders</strong><small>Check status and delivery details</small></span><MdChevronRight /></button></section></>;
}

function Metric({ label, value, detail, warning }) { return <div className="admin-metric"><span>{label}</span><strong>{value}</strong><small className={warning ? 'warning' : ''}>{detail}</small></div>; }

function Inventory({ query, setQuery }) {
  const filtered = useMemo(() => accounts.filter((account) => `${account.title} ${account.platform} ${account.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <><div className="admin-actions"><div className="admin-search"><MdSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory" /></div><button type="button" className="admin-primary"><MdAdd /> Add test listing</button></div><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Account inventory</h2><p>{filtered.length} test listings in the catalog.</p></div></div><div className="inventory-grid">{filtered.map((account) => { const meta = platformMeta[account.platform]; const Icon = meta.icon; return <article className="inventory-card" key={account.id}><div className="inventory-card-top"><span style={{ color: meta.color, background: `${meta.color}18` }}><Icon /> {account.platform}</span><button type="button"><MdMoreHoriz /></button></div><h3>{account.title}</h3><p>{account.handle} · {account.category}</p><div><span>{account.followers} followers</span><strong>${account.price}</strong></div></article>; })}</div></section></>;
}

function Orders({ query, setQuery }) {
  const filtered = useMemo(() => orderData.filter((order) => `${order.id} ${order.customer} ${order.status}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <><div className="admin-actions"><div className="admin-search"><MdSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer" /></div></div><section className="admin-panel"><div className="admin-panel-heading"><div><h2>All orders</h2><p>Manage status and customer delivery.</p></div></div><AdminOrders orders={filtered} detailed /></section></>;
}

function AdminOrders({ orders, detailed }) { return <div className="admin-orders">{orders.map((order) => { const account = accounts.find((item) => item.id === order.accountId); return <div className="admin-order-row" key={order.id}><div><strong>{order.id}</strong><span>{order.date}</span></div><div className="admin-customer"><strong>{order.customer}</strong>{detailed && <span>{order.email}</span>}</div><div className="admin-order-account"><strong>{account.title}</strong><span>{account.platform}</span></div><strong>${order.total}</strong><span className={`admin-status ${order.status.toLowerCase()}`}>{order.status}</span>{detailed && <button type="button" className="row-action">Manage</button>}</div>; })}</div>; }

function Customers() { return <section className="admin-panel customers-panel"><div className="admin-panel-heading"><div><h2>Customers</h2><p>All data below is part of the frontend preview.</p></div></div>{orderData.map((order) => <div className="customer-row" key={order.email}><div className="customer-initial">{order.customer.split(' ').map((part) => part[0]).join('')}</div><div><strong>{order.customer}</strong><span>{order.email}</span></div><span>1 test order</span><button type="button">View profile</button></div>)}</section>; }

export default Admin;
