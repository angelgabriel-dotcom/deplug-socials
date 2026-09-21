import { useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdAnalytics,
  MdCheckCircle,
  MdChevronRight,
  MdDashboard,
  MdGroups,
  MdInventory2,
  MdMoreHoriz,
  MdReceiptLong,
  MdSearch,
  MdSettings,
} from 'react-icons/md';
import { accounts as fallbackAccounts, platformMeta } from '../data/accounts';
import '../styles/admin.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const adminTabs = [
  { id: 'overview', label: 'Overview', icon: MdDashboard },
  { id: 'inventory', label: 'Inventory', icon: MdInventory2 },
  { id: 'orders', label: 'Orders', icon: MdReceiptLong },
  { id: 'customers', label: 'Customers', icon: MdGroups },
];

function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState(fallbackAccounts);
  const [loading, setLoading] = useState(true);

  // Load orders and inventory from backend
  const loadData = () => {
    if (!token) return;
    Promise.all([
      api.getAdminOrders(token).catch(() => ({ orders: [] })),
      api.getListings({ status: '' }).catch(() => ({ listings: fallbackAccounts })),
    ]).then(([ordersRes, listingsRes]) => {
      if (ordersRes?.orders) setOrders(ordersRes.orders);
      if (listingsRes?.listings) setInventory(listingsRes.listings);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [token]);

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
          {activeTab === 'inventory' && <Inventory inventory={inventory} query={query} setQuery={setQuery} />}
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
        <Metric label="Platform revenue" value={`$${revenue.toFixed(2)}`} detail={`From ${orders.length} orders`} />
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

function Inventory({ inventory, query, setQuery }) {
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

            return (
              <article className="inventory-card" key={account.id}>
                <div className="inventory-card-top">
                  <span style={{ color: meta.color, background: `${meta.color}18` }}>
                    <Icon /> {account.platform}
                  </span>
                  <span className={`admin-status ${isSold ? 'delivered' : 'pending'}`}>
                    {isSold ? 'Sold' : 'Available'}
                  </span>
                </div>
                <h3>{account.title}</h3>
                <p>{account.handle} · {account.category}</p>
                <div>
                  <span>{account.followers} followers</span>
                  <strong>${account.price}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
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
            <strong>${order.total}</strong>
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
          <span>{customer.ordersCount} {customer.ordersCount === 1 ? 'order' : 'orders'} (${customer.totalSpent.toFixed(2)})</span>
        </div>
      ))}
    </section>
  );
}

export default Admin;
