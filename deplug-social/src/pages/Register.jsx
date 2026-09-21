import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdCheckCircle, MdEmail, MdFingerprint, MdLock, MdPerson } from 'react-icons/md';
import '../styles/auth.css';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { beginSession } = useAuth();
  const navigate = useNavigate();
  const passwordsMatch = formData.password.length >= 8 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const auth = await api.register(formData.username, formData.username, formData.email, formData.password);
      beginSession(auth);
      navigate('/dashboard', { replace: true });
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
          <h1>Create Account</h1>
          <p>Join the marketplace for premium US numbers</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <span className="input-icon"><MdPerson /></span>
              <input
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>
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
            <label>Password</label>
            <div className="input-wrapper">
              <span className="input-icon"><MdLock /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a password"
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
          <div className="form-group biometric-confirmation">
            <label>Confirm Password</label>
            <div className={`input-wrapper ${passwordsMatch ? 'password-match' : passwordsMismatch ? 'password-mismatch' : ''}`}>
              <span className="input-icon"><MdLock /></span>
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-describedby="password-confirmation-status"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            <div id="password-confirmation-status" className={`biometric-status ${passwordsMatch ? 'is-verified' : passwordsMismatch ? 'is-mismatch' : ''}`} aria-live="polite">
              <span className="biometric-scan"><MdFingerprint /></span>
              <span className="biometric-copy">
                <strong>{passwordsMatch ? 'Password match verified' : passwordsMismatch ? 'Passwords do not match yet' : 'Secure confirmation scan'}</strong>
                <small>{passwordsMatch ? 'Your password confirmation is ready.' : 'Your match will be checked as you type.'}</small>
              </span>
              {passwordsMatch && <MdCheckCircle className="biometric-check" />}
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Register;
