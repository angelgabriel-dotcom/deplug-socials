import { Link } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import '../styles/not-found.css';

function NotFound() {
  return <main className="not-found-page"><div><p>404</p><h1>That page has gone off-grid.</h1><span>It may have moved, been removed, or never existed in the first place.</span><Link to="/"><MdArrowBack /> Return home</Link></div></main>;
}

export default NotFound;
