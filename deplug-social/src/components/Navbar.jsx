import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MdClose, MdMenu } from 'react-icons/md';
import '../styles/navbar.css';

function Navbar() {
  const [darkMode, setDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('light-mode');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Deplug Social</Link>
      </div>
      <button className="mobile-menu-btn" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
        {menuOpen ? <MdClose /> : <MdMenu />}
      </button>
      <div className={`navbar-links ${menuOpen ? 'menu-open' : ''}`}>
        <NavLink to="/browse" onClick={() => setMenuOpen(false)}>Browse</NavLink>
        <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
        <NavLink to="/login" onClick={() => setMenuOpen(false)}>Login</NavLink>
        <NavLink to="/register" className="nav-register" onClick={() => setMenuOpen(false)}>Register</NavLink>
        <button className="toggle-btn" onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
