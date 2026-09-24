import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdChevronLeft, MdChevronRight, MdSearch, MdTune } from 'react-icons/md';
import { accounts as fallbackAccounts, platformMeta } from '../data/accounts';
import '../styles/browse.css';
import { api } from '../lib/api';
import { formatNaira } from '../lib/money';

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
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState(fallbackAccounts.slice(0, 12));
  const [pagination, setPagination] = useState({ page: 1, total: fallbackAccounts.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const debounce = window.setTimeout(() => {
      setLoading(true);
      api.getListings({ platform, search: search.trim(), sort, page, limit: 12 })
      .then((res) => {
        if (active && res?.listings) {
          setCatalog(res.listings);
          setPagination(res.pagination || { page: 1, total: res.listings.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
        }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(debounce); };
  }, [page, platform, search, sort]);

  const resetFilters = () => {
    setPlatform('all');
    setSearch('');
    setSort('featured');
    setPage(1);
  };

  const updatePlatform = (value) => { setPlatform(value); setPage(1); };
  const updateSearch = (value) => { setSearch(value); setPage(1); };
  const updateSort = (value) => { setSort(value); setPage(1); };
  const pageNumbers = getPageNumbers(pagination.page, pagination.totalPages);

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
                  onChange={() => updatePlatform(option.value)}
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
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search accounts, categories, or platforms"
                aria-label="Search accounts"
              />
            </div>
            <label className="sort-select">
              Sort by
              <select value={sort} onChange={(event) => updateSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>

          <div className="catalog-result-row">
            <p><strong>{pagination.total}</strong> accounts available</p>
            <span>{loading ? 'Updating inventory…' : `Page ${pagination.page} of ${pagination.totalPages}`}</span>
          </div>

          {catalog.length ? (
            <div className="account-grid">
              {catalog.map((account) => {
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
                        <strong>{formatNaira(account.price)}</strong>
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

          {pagination.totalPages > 1 && (
            <nav className="catalog-pagination" aria-label="Catalog pages">
              <button type="button" onClick={() => setPage(page - 1)} disabled={!pagination.hasPreviousPage} aria-label="Previous page"><MdChevronLeft /></button>
              {pageNumbers.map((pageNumber, index) => pageNumber === 'ellipsis' ? (
                <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
              ) : (
                <button type="button" key={pageNumber} onClick={() => setPage(pageNumber)} className={pagination.page === pageNumber ? 'active' : ''} aria-current={pagination.page === pageNumber ? 'page' : undefined}>{pageNumber}</button>
              ))}
              <button type="button" onClick={() => setPage(page + 1)} disabled={!pagination.hasNextPage} aria-label="Next page"><MdChevronRight /></button>
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [1];
  if (currentPage > 3) pages.push('ellipsis');
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) pages.push(page);
  if (currentPage < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export default Browse;
