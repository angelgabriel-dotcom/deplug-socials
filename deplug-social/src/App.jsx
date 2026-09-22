import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import './index.css';
import Landing from './pages/Landing';
import Browse from './pages/Browse';
import AccountDetails from './pages/AccountDetails';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import BackButton from './components/BackButton';
import PaymentVerify from './pages/PaymentVerify';

function App() {
  return (
    <Router>
      <Navbar />
      <BackButton />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/account/:accountId" element={<AccountDetails />} />
        <Route path="/checkout/:accountId" element={<Checkout />} />
        <Route path="/payment/verify" element={<ProtectedRoute><PaymentVerify /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
