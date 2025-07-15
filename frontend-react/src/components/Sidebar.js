import { FaTwitter, FaInstagram, FaYoutube, FaFacebook } from 'react-icons/fa';
import './Sidebar.css';
const SocialSidebar = () => {
  return (
    <>
      {/* Desktop Version (Vertical) */}
      <div className="social-sidebar d-none d-md-flex">
        <div className="social-icons-vertical">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaTwitter size={18} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaFacebook size={18} />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaInstagram size={18} />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaYoutube size={18} />
          </a>
        </div>
      </div>

      {/* Mobile Version (Horizontal) */}
      <div className="social-sidebar-mobile d-md-none">
        <div className="social-icons-horizontal">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaTwitter size={18} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaFacebook size={18} />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaInstagram size={18} />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <FaYoutube size={18} />
          </a>
        </div>
      </div>
    </>
  );
};

export default SocialSidebar;