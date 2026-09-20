import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdEmail } from 'react-icons/md';
import '../styles/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!email) { setError('Enter your email address'); return; }
    setError(''); setSent(true);
  };

  return <div className="auth-container"><div className="auth-card recovery-card">
    {sent ? <div className="recovery-message"><span><MdCheckCircle /></span><h1>Check your inbox</h1><p>If this were connected to the backend, a reset link would be sent to <strong>{email}</strong>.</p><Link className="auth-btn recovery-link" to="/reset-password">Open reset-page preview</Link><Link className="simple-link" to="/login">Back to login</Link></div> : <><div className="auth-header"><p className="auth-brand">Deplug Social</p><h1>Reset your password</h1><p>Enter your email and we’ll send recovery instructions.</p></div>{error && <div className="auth-error">{error}</div>}<form className="auth-form" onSubmit={submit}><div className="form-group"><label>Email</label><div className="input-wrapper"><span className="input-icon"><MdEmail /></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" /></div></div><button className="auth-btn" type="submit">Send reset link</button></form><div className="auth-footer"><p>Remembered it? <Link to="/login">Login</Link></p></div></>}
  </div></div>;
}

export default ForgotPassword;
