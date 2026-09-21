import { MdArrowBack } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasLocalBack = /^\/account\/|^\/checkout\//.test(location.pathname);

  if (location.pathname === '/' || hasLocalBack) return null;

  const goBack = () => {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return <button className="app-back-button" type="button" onClick={goBack}><MdArrowBack /> <span>Back</span></button>;
}

export default BackButton;
