import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdAnalytics,
  MdCheckCircle,
  MdChevronRight,
  MdDashboard,
  MdEdit,
  MdGroups,
  MdInventory2,
  MdClose,
  MdReceiptLong,
  MdSearch,
  MdSettings,
} from 'react-icons/md';
import { accounts as fallbackAccounts, platformMeta } from '../data/accounts';
import '../styles/admin.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatNaira } from '../lib/money';

const adminTabs = [
  { id: 'overview', label: 'Overview', icon: MdDashboard },
  { id: 'inventory', label: 'Inventory', icon: MdInventory2 },
  { id: 'orders', label: 'Orders', icon: MdReceiptLong },
  { id: 'customers', label: 'Customers', icon: MdGroups },
];

const blankListing = {
  platform: 'Instagram', title: '', handle: '', category: '', followers: '', engagement: '', accountAge: '', audience: 'Global',
  price: '', description: '', verified: false, status: 'draft', login: '', password: '', recoveryEmail: '', transferNotes: '',
};

function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState(fallbackAccounts);
  const [editingListing, setEditingListing] = useState(null);

  // Load orders and inventory from backend
  const loadData = useCallback(() => {
    if (!token) return;
    Promise.all([
      api.getAdminOrders(token).catch(() => ({ orders: [] })),
      api.getAdminListings(token).catch(() => ({ listings: fallbackAccounts })),
    ]).then(([ordersRes, listingsRes]) => {
      if (ordersRes?.orders) setOrders(ordersRes.orders);
      if (listingsRes?.listings) setInventory(listingsRes.listings);
    });
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusToggle = async (order) => {
    const nextStatus = (order.status || '').toLowerCase() === 'delivered' ? 'processing' : 'delivered';
    try {
      await api.updateOrderStatus(token, order.id, nextStatus);
      // Reload orders
      const res = await api.getAdminOrders(token);
      if (res?.orders) setOrders(res.orders);
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const saveListing = async (form) => {
    const response = editingListing?.id
      ? await api.updateAdminListing(token, editingListing.id, form)
      : await api.createAdminListing(token, form);
    setInventory((current) => editingListing?.id
      ? current.map((listing) => listing.id === response.listing.id ? response.listing : listing)
      : [response.listing, ...current]);
    setEditingListing(null);
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span>DS</span>
            <div>
              <strong>Deplug Social</strong>
              <small>Operations Dashboard</small>
            </div>
          </div>
          <nav>
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                  key={tab.id}
                >
                  <Icon /> {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="admin-sidebar-bottom">
            <button type="button"><MdAnalytics /> Analytics</button>
            <button type="button"><MdSettings /> Settings</button>
          </div>
        </aside>

        <section className="admin-content">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">Operations</p>
              <h1>{activeTab === 'overview' ? 'Admin overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            </div>
            <span className="admin-preview"><MdCheckCircle /> Live database connected</span>
          </header>

          {activeTab === 'overview' && (
            <Overview
              orders={orders}
              inventory={inventory}
              onTabChange={setActiveTab}
              onToggleStatus={handleStatusToggle}
            />
          )}
          {activeTab === 'inventory' && <Inventory inventory={inventory} query={query} setQuery={setQuery} onCreate={() => setEditingListing(blankListing)} onEdit={setEditingListing} />}
          {activeTab === 'orders' && (
            <Orders
              orders={orders}
              query={query}
              setQuery={setQuery}
              onToggleStatus={handleStatusToggle}
            />
          )}
          {activeTab === 'customers' && <Customers orders={orders} />}
        </section>
      </div>
      {editingListing && <ListingEditor listing={editingListing} onClose={() => setEditingListing(null)} onSave={saveListing} />}
    </main>
  );
}

function Overview({ orders, inventory, onTabChange, onToggleStatus }) {
  const pendingOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'processing').length;
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const uniqueCustomers = new Set(orders.map((o) => o.contactEmail || o.email).filter(Boolean)).size;

  return (
    <>
      <div className="admin-metrics">
        <Metric label="Listed accounts" value={String(inventory.length)} detail="Catalog size" />
        <Metric
          label="Pending / Processing"
          value={String(pendingOrders)}
          detail={pendingOrders > 0 ? 'Needs review' : 'All delivered'}
          warning={pendingOrders > 0}
        />
        <Metric label="Platform revenue" value={formatNaira(revenue)} detail={`From ${orders.length} orders`} />
        <Metric label="Unique buyers" value={String(uniqueCustomers)} detail="Active customers" />
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Latest transactions and handover statuses.</p>
          </div>
          <button type="button" onClick={() => onTabChange('orders')}>View all <MdChevronRight /></button>
        </div>
        <AdminOrders orders={orders.slice(0, 5)} onToggleStatus={onToggleStatus} />
      </section>

      <section className="admin-panel quick-actions">
        <div className="admin-panel-heading">
          <div>
            <h2>Quick actions</h2>
            <p>Operations workflows.</p>
          </div>
        </div>
        <button type="button" onClick={() => onTabChange('inventory')}>
          <MdAdd />
          <span>
            <strong>View inventory catalog</strong>
            <small>Inspect listings and sold statuses</small>
          </span>
          <MdChevronRight />
        </button>
        <button type="button" onClick={() => onTabChange('orders')}>
          <MdReceiptLong />
          <span>
            <strong>Manage customer orders</strong>
            <small>Review delivery and toggle credentials</small>
          </span>
          <MdChevronRight />
        </button>
      </section>
    </>
  );
}

function Metric({ label, value, detail, warning }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={warning ? 'warning' : ''}>{detail}</small>
    </div>
  );
}

function Inventory({ inventory, query, setQuery, onCreate, onEdit }) {
  const filtered = useMemo(
    () => inventory.filter((account) =>
      `${account.title} ${account.platform} ${account.category} ${account.handle}`.toLowerCase().includes(query.toLowerCase())
    ),
    [inventory, query]
  );

  return (
    <>
      <div className="admin-actions">
        <div className="admin-search">
          <MdSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inventory by title, platform, or handle"
          />
        </div>
        <button className="admin-primary" type="button" onClick={onCreate}><MdAdd /> Add listing</button>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Account inventory</h2>
            <p>{filtered.length} listings recorded in database.</p>
          </div>
        </div>
        <div className="inventory-grid">
          {filtered.map((account) => {
            const meta = platformMeta[account.platform] || { color: '#6c63ff', icon: MdCheckCircle };
            const Icon = meta.icon;
            const isSold = account.status === 'sold';
            const statusLabel = account.status === 'published' ? 'Available' : account.status === 'draft' ? 'Draft — hidden' : account.status === 'archived' ? 'Archived — hidden' : isSold ? 'Sold' : 'Payment pending';

            return (
              <article className="inventory-card" key={account.id}>
                <div className="inventory-card-top">
                  <span style={{ color: meta.color, background: `${meta.color}18` }}>
                    <Icon /> {account.platform}
                  </span>
                  <span className={`admin-status ${isSold ? 'delivered' : account.status}`}>
                    {statusLabel}
                  </span>
                </div>
                <h3>{account.title}</h3>
                <p>{account.handle} · {account.category}</p>
                <div>
                  <span>{account.followers} followers</span>
                  <span className="inventory-card-actions"><strong>{formatNaira(account.price)}</strong><button type="button" onClick={() => onEdit(account)} disabled={account.status === 'sold' || account.status === 'payment_pending'} aria-label={`Edit ${account.title}`}><MdEdit /></button></span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function ListingEditor({ listing, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankListing, ...listing, accountAge: listing.accountAge || listing.age || '', ...(listing.credentials || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError('');
    try { await onSave(form); } catch (requestError) { setError(requestError.message || 'Unable to save listing.'); } finally { setSaving(false); }
  };

  return (
    <div className="listing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="listing-editor" role="dialog" aria-modal="true" aria-labelledby="listing-editor-title">
        <header><div><p className="eyebrow">Inventory control</p><h2 id="listing-editor-title">{listing.id ? 'Edit listing' : 'Add a listing'}</h2></div><button type="button" onClick={onClose} aria-label="Close editor"><MdClose /></button></header>
        <form onSubmit={submit}>
          {error && <p className="listing-form-error">{error}</p>}
          <div className="listing-form-grid">
            <label>Platform<select value={form.platform} onChange={(event) => update('platform', event.target.value)}><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Twitter/X</option><option>YouTube</option><option>Telegram</option></select></label>
            <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <label>Listing title<input required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Fashion creator account" /></label>
            <label>Handle / page name<input required value={form.handle} onChange={(event) => update('handle', event.target.value)} placeholder="@yourhandle" /></label>
            <label>Category<input required value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Fashion" /></label>
            <label>Price (NGN)<input required min="0.01" step="0.01" type="number" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="25000" /></label>
            <label>Followers<input required value={form.followers} onChange={(event) => update('followers', event.target.value)} placeholder="10.5K" /></label>
            <label>Engagement<input required value={form.engagement} onChange={(event) => update('engagement', event.target.value)} placeholder="4.8%" /></label>
            <label>Account age<input required value={form.accountAge} onChange={(event) => update('accountAge', event.target.value)} placeholder="2 years" /></label>
            <label>Audience<input value={form.audience} onChange={(event) => update('audience', event.target.value)} placeholder="Nigeria" /></label>
            <label className="listing-full-field">Description<textarea required value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe what the buyer is getting." rows="3" /></label>
          </div>
          <label className="listing-verified"><input type="checkbox" checked={form.verified} onChange={(event) => update('verified', event.target.checked)} /> Verified listing</label>
          <section className="listing-credentials"><div><h3>Private handover details</h3><p>Only admins can see these fields. Buyers receive them only after delivery is approved.</p></div><div className="listing-form-grid"><label>Login / username<input value={form.login} onChange={(event) => update('login', event.target.value)} /></label><label>Password<input value={form.password} onChange={(event) => update('password', event.target.value)} /></label><label>Recovery email<input type="email" value={form.recoveryEmail} onChange={(event) => update('recoveryEmail', event.target.value)} /></label><label className="listing-full-field">Transfer notes<textarea value={form.transferNotes} onChange={(event) => update('transferNotes', event.target.value)} rows="2" /></label></div></section>
          <footer><button type="button" className="listing-cancel" onClick={onClose}>Cancel</button><button type="submit" className="admin-primary" disabled={saving}>{saving ? 'Saving…' : listing.id ? 'Save changes' : 'Create listing'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function Orders({ orders, query, setQuery, onToggleStatus }) {
  const filtered = useMemo(
    () => orders.filter((order) =>
      `${order.id} ${order.contactName || order.customer || ''} ${order.contactEmail || order.email || ''} ${order.status}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ),
    [orders, query]
  );

  return (
    <>
      <div className="admin-actions">
        <div className="admin-search">
          <MdSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order reference, customer, or status"
          />
        </div>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>All orders</h2>
            <p>Manage customer delivery and credential access.</p>
          </div>
        </div>
        <AdminOrders orders={filtered} detailed onToggleStatus={onToggleStatus} />
      </section>
    </>
  );
}

function AdminOrders({ orders, detailed, onToggleStatus }) {
  if (!orders.length) {
    return <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No orders match the criteria.</p>;
  }

  return (
    <div className="admin-orders">
      {orders.map((order) => {
        const customerName = order.contactName || order.customer || 'Customer';
        const customerEmail = order.contactEmail || order.email || '';
        const statusClass = (order.status || 'processing').toLowerCase();

        return (
          <div className="admin-order-row" key={order.id}>
            <div>
              <strong>{order.id}</strong>
              <span>{order.date}</span>
            </div>
            <div className="admin-customer">
              <strong>{customerName}</strong>
              {detailed && <span>{customerEmail}</span>}
            </div>
            <div className="admin-order-account">
              <strong>{order.title}</strong>
              <span>{order.platform} · {order.handle}</span>
            </div>
            <strong>{formatNaira(order.total)}</strong>
            <span className={`admin-status ${statusClass}`}>
              {order.status}
            </span>
            {onToggleStatus && (
              <button
                type="button"
                className="row-action"
                onClick={() => onToggleStatus(order)}
                title="Click to toggle status between Processing and Delivered"
              >
                Toggle Status
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Customers({ orders }) {
  const customerMap = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      const email = (order.contactEmail || order.email || '').toLowerCase();
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, {
          name: order.contactName || order.customer || 'Customer',
          email,
          ordersCount: 1,
          totalSpent: order.total || 0,
        });
      } else {
        const existing = map.get(email);
        existing.ordersCount += 1;
        existing.totalSpent += order.total || 0;
      }
    }
    return Array.from(map.values());
  }, [orders]);

  return (
    <section className="admin-panel customers-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Customers</h2>
          <p>{customerMap.length} unique buyers from confirmed transactions.</p>
        </div>
      </div>
      {customerMap.map((customer) => (
        <div className="customer-row" key={customer.email}>
          <div className="customer-initial">
            {customer.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{customer.name}</strong>
            <span>{customer.email}</span>
          </div>
          <span>{customer.ordersCount} {customer.ordersCount === 1 ? 'order' : 'orders'} ({formatNaira(customer.totalSpent)})</span>
        </div>
      ))}
    </section>
  );
}

export default Admin;
