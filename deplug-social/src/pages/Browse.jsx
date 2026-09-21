import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdSearch, MdTune } from 'react-icons/md';
import { accounts as fallbackAccounts, platformMeta } from '../data/accounts';
import '../styles/browse.css';
import { api } from '../lib/api';

const platformOptions = [
  { name: 'All platforms', value: 'all' },
  { name: 'Facebook', value: 'Facebook' },
  { name: 'Instagram', value: 'Instagram' },
  { name: 'TikTok', value: 'TikTok' },
  { name: 'Twitter/X', value: 'Twitter/X' },
  { name: 'YouTube', value: 'YouTube' },
  { name: 'Telegram', value: 'Telegram' },
];

function Browse() {
  const [platform, setPlatform] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [catalog, setCatalog] = useState(fallbackAccounts);

  useEffect(() => {
    let active = true;
    api.getListings()
      .then((res) => {
        if (active && res?.listings?.length) {
          setCatalog(res.listings);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const resetFilters = () => {
    setPlatform('all');
    setSearch('');
    setSort('featured');
  };

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = catalog.filter((account) => {
      const matchesPlatform = platform === 'all' || account.platform === platform;
      const matchesSearch = !query || `${account.title} ${account.handle} ${account.category} ${account.platform}`.toLowerCase().includes(query);
      return matchesPlatform && matchesSearch;
    });

    return [...visible].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      // Prioritize available listings over sold, then verified
      if (a.status === 'sold' && b.status !== 'sold') return 1;
      if (b.status === 'sold' && a.status !== 'sold') return -1;
      return (b.verified - a.verified) || (b.price - a.price);
    });
  }, [catalog, platform, search, sort]);

  return (
    <main className="browse-page">
      <section className="browse-hero">
        <div className="browse-hero-content">
          <p className="eyebrow">Marketplace</p>
          <h1>Find the right <span className="gradient-text">account</span> for your next move.</h1>
          <p>Browse verified social accounts with transparent performance details and instant delivery.</p>
        </div>
      </section>

      <section className="catalog-shell" aria-label="Account catalog">
        <aside className="catalog-filters">
          <div className="filter-heading">
            <MdTune />
            <h2>Filters</h2>
          </div>
          <div className="filter-group">
            <p>Platform</p>
            {platformOptions.map((option) => (
              <label className="filter-option" key={option.value}>
                <input
                  type="radio"
                  name="platform"
                  value={option.value}
                  checked={platform === option.value}
                  onChange={() => setPlatform(option.value)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
          <button className="clear-filters" type="button" onClick={resetFilters}>Clear filters</button>
        </aside>

        <div className="catalog-content">
          <div className="catalog-toolbar">
            <div className="search-box">
              <MdSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts, categories, or platforms"
                aria-label="Search accounts"
              />
            </div>
            <label className="sort-select">
              Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>

          <div className="catalog-result-row">
            <p><strong>{filteredAccounts.length}</strong> accounts available</p>
            <span>Live inventory updated automatically</span>
          </div>

          {filteredAccounts.length ? (
            <div className="account-grid">
              {filteredAccounts.map((account) => {
                const meta = platformMeta[account.platform] || { color: '#6c63ff', icon: MdCheckCircle };
                const PlatformIcon = meta.icon;
                const isSold = account.status === 'sold';

                return (
                  <article className="account-card" key={account.id}>
                    <div className="account-card-top">
                      <span className="platform-chip" style={{ color: meta.color, borderColor: `${meta.color}55` }}>
                        <PlatformIcon /> {account.platform}
                      </span>
                      {isSold ? (
                        <span className="sold-label">Sold</span>
                      ) : (
                        account.verified && <span className="verified-label"><MdCheckCircle /> Verified</span>
                      )}
                    </div>

                    <div className="account-identity">
                      <div className="account-avatar" style={{ background: `${meta.color}20`, color: meta.color }}>
                        <PlatformIcon />
                      </div>
                      <div>
                        <h2>{account.title}</h2>
                        <p>{account.handle}</p>
                      </div>
                    </div>

                    <div className="account-stats">
                      <div>
                        <span>Followers</span>
                        <strong>{account.followers}</strong>
                      </div>
                      <div>
                        <span>Engagement</span>
                        <strong>{account.engagement}</strong>
                      </div>
                      <div>
                        <span>Age</span>
                        <strong>{account.age}</strong>
                      </div>
                    </div>

                    <div className="account-card-bottom">
                      <div>
                        <span>Price</span>
                        <strong>${account.price}</strong>
                      </div>
                      <Link
                        to={`/account/${account.id}`}
                        className={`view-account ${isSold ? 'sold-btn' : ''}`}
                      >
                        {isSold ? 'View details' : 'View account'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-catalog">
              <h2>No accounts found</h2>
              <p>Try a different search or clear your filters.</p>
              <button type="button" onClick={resetFilters}>Show all accounts</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Browse;
