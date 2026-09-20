import { FaFacebook, FaInstagram, FaTiktok, FaTwitter, FaYoutube, FaTelegram } from 'react-icons/fa';

export const platformMeta = {
  Facebook: { icon: FaFacebook, color: '#1877f2' }, Instagram: { icon: FaInstagram, color: '#e1306c' }, TikTok: { icon: FaTiktok, color: '#ff0050' },
  'Twitter/X': { icon: FaTwitter, color: '#1da1f2' }, YouTube: { icon: FaYoutube, color: '#ff0000' }, Telegram: { icon: FaTelegram, color: '#0088cc' },
};

export const accounts = [
  { id: 1, platform: 'Instagram', title: 'Lifestyle creator account', handle: '@marie.journal', followers: '42.8K', engagement: '5.7%', age: '3 years', price: 149, verified: true, category: 'Lifestyle' },
  { id: 2, platform: 'TikTok', title: 'Entertainment account', handle: '@dailyvibess', followers: '118K', engagement: '8.2%', age: '2 years', price: 229, verified: true, category: 'Entertainment' },
  { id: 3, platform: 'Facebook', title: 'US business page', handle: 'Local Market Daily', followers: '27.4K', engagement: '4.9%', age: '5 years', price: 119, verified: true, category: 'Business' },
  { id: 4, platform: 'Twitter/X', title: 'Tech community account', handle: '@buildnotes', followers: '18.6K', engagement: '6.4%', age: '4 years', price: 95, verified: false, category: 'Technology' },
  { id: 5, platform: 'YouTube', title: 'Gaming channel', handle: 'Level Up Today', followers: '9.2K', engagement: '7.1%', age: '3 years', price: 179, verified: true, category: 'Gaming' },
  { id: 6, platform: 'Telegram', title: 'Crypto community channel', handle: '@coinbriefs', followers: '15.7K', engagement: '9.4%', age: '2 years', price: 135, verified: true, category: 'Finance' },
  { id: 7, platform: 'Instagram', title: 'Fashion niche account', handle: '@theeditroom', followers: '76.1K', engagement: '3.8%', age: '4 years', price: 265, verified: true, category: 'Fashion' },
  { id: 8, platform: 'TikTok', title: 'Food discovery account', handle: '@taste.trails', followers: '33.9K', engagement: '7.8%', age: '1 year', price: 109, verified: false, category: 'Food' },
];
