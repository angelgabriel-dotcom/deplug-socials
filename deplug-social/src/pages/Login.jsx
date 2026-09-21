import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdEmail, MdLock } from 'react-icons/md';
import '../styles/auth.css';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { beginSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const auth = await api.login(formData.email, formData.password);
      beginSession(auth);
      navigate(location.state?.from || (auth.user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-brand">Deplug Social</p>
          <h1>Welcome Back</h1>
          <p>Login to your account to continue</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <span className="input-icon"><MdEmail /></span>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <div className="form-label-row">
              <label>Password</label>
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>
            <div className="input-wrapper">
              <span className="input-icon"><MdLock /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
