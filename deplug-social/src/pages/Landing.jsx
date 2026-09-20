import { Link } from 'react-router-dom';
import { MdVerified, MdSecurity, MdSpeed, MdSupportAgent } from 'react-icons/md';
import { FaFacebook, FaTiktok, FaInstagram, FaTwitter, FaYoutube, FaTelegram } from 'react-icons/fa';
import '../styles/landing.css';

const platforms = [
  { icon: <FaFacebook />, name: 'Facebook', accounts: '1,240+', color: '#1877f2' },
  { icon: <FaTiktok />, name: 'TikTok', accounts: '980+', color: '#ff0050' },
  { icon: <FaInstagram />, name: 'Instagram', accounts: '1,540+', color: '#e1306c' },
  { icon: <FaTwitter />, name: 'Twitter/X', accounts: '760+', color: '#1da1f2' },
  { icon: <FaYoutube />, name: 'YouTube', accounts: '430+', color: '#ff0000' },
  { icon: <FaTelegram />, name: 'Telegram', accounts: '620+', color: '#0088cc' },
];

const features = [
  { icon: <MdVerified />, title: 'Verified Accounts', desc: 'Every account is tested and verified before listing. What you see is what you get.' },
  { icon: <MdSecurity />, title: 'Secure Transactions', desc: 'Your payment and data are protected with industry-standard encryption.' },
  { icon: <MdSpeed />, title: 'Instant Delivery', desc: 'Get your login credentials delivered instantly after successful payment.' },
  { icon: <MdSupportAgent />, title: '24/7 Support', desc: 'Our team is always available to help you with any issue or question.' },
];

const steps = [
  { number: '01', title: 'Browse Platforms', desc: 'Choose from a wide range of social media platforms and account types.' },
  { number: '02', title: 'Select & Pay', desc: 'Pick the account you want and complete a secure payment via Paystack.' },
  { number: '03', title: 'Get Credentials', desc: 'Receive your login details instantly and take full control of the account.' },
];

function Landing() {
  return (
    <div className="landing">

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge">🔥 Trusted by 10,000+ buyers worldwide</div>
          <h1>
            Buy Premium <span className="gradient-text">Social Media</span> Accounts Instantly
          </h1>
          <p>
            Access verified Facebook, TikTok, Instagram, and more accounts with full credentials. 
            Safe, fast, and reliable.
          </p>
          <div className="hero-btns">
            <Link to="/register" className="btn-primary">Get Started</Link>
            <Link to="/browse" className="btn-secondary">Browse Accounts</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-bar">
        <div className="stat">
          <h3>5,500+</h3>
          <p>Accounts Sold</p>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <h3>6</h3>
          <p>Platforms</p>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <h3>10K+</h3>
          <p>Happy Buyers</p>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <h3>99%</h3>
          <p>Success Rate</p>
        </div>
      </section>

      {/* PLATFORMS */}
      <section className="platforms-section">
        <div className="section-header">
          <h2>Available <span className="gradient-text">Platforms</span></h2>
          <p>Choose from the most popular social media platforms</p>
        </div>
        <div className="platforms-grid">
          {platforms.map((platform, i) => (
            <Link to="/browse" className="platform-card" key={i}>
              <div className="platform-icon" style={{ color: platform.color }}>
                {platform.icon}
              </div>
              <h3>{platform.name}</h3>
              <p>{platform.accounts} accounts</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <div className="section-header">
          <h2>Why Choose <span className="gradient-text">Deplug Social</span></h2>
          <p>Everything you need to buy with confidence</p>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps-section">
        <div className="section-header">
          <h2>How It <span className="gradient-text">Works</span></h2>
          <p>Get your account in three simple steps</p>
        </div>
        <div className="steps-grid">
          {steps.map((step, i) => (
            <div className="step-card" key={i}>
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of buyers who trust Deplug Social</p>
        <Link to="/register" className="btn-primary">Create Free Account</Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">Deplug Social</div>
        <p>© 2025 Deplug Social. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/browse">Browse</Link>
        </div>
      </footer>

    </div>
  );
}

export default Landing;
