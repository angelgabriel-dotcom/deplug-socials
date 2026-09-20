import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdLock } from 'react-icons/md';
import '../styles/auth.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const submit = (event) => { event.preventDefault(); if (password.length < 6) { setError('Password must be at least 6 characters'); return; } if (password !== confirmPassword) { setError('Passwords do not match'); return; } setError(''); setComplete(true); };
  return <div className="auth-container"><div className="auth-card recovery-card">{complete ? <div className="recovery-message"><span><MdCheckCircle /></span><h1>Password updated</h1><p>Your password reset is complete in this frontend preview.</p><Link className="auth-btn recovery-link" to="/login">Continue to login</Link></div> : <><div className="auth-header"><p className="auth-brand">Deplug Social</p><h1>Create a new password</h1><p>Choose a strong password for your account.</p></div>{error && <div className="auth-error">{error}</div>}<form className="auth-form" onSubmit={submit}><div className="form-group"><label>New password</label><div className="input-wrapper"><span className="input-icon"><MdLock /></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" /></div></div><div className="form-group"><label>Confirm new password</label><div className="input-wrapper"><span className="input-icon"><MdLock /></span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your password" /></div></div><button className="auth-btn" type="submit">Update password</button></form></>}</div></div>;
}

export default ResetPassword;
