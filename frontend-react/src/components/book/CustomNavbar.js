import React, { useState, useCallback } from 'react';
import { useAuth } from '../Auth';
import { Navbar, Nav, Container, Button, Offcanvas, Toast, ToastContainer } from 'react-bootstrap';
import { FiMenu, FiUser, FiHome, FiRotateCcw } from 'react-icons/fi';
import { HiOutlineTicket } from 'react-icons/hi2';
import { debounce } from 'lodash'; 
import { useNavigate } from 'react-router-dom';
import './CustomNavbar.css';

const CustomNavbar = ({ setShowProfile, loginOutButton, setLoginOutButton, setShowLogin, setShowContact, setShowHistory}) => {
  const { accessToken, refreshToken, logout } = useAuth();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const navigate = useNavigate();

  const handleProfileClick = useCallback(
    debounce(() => {
      setShowProfile(true);
    }, 300),
    [setShowProfile]
  );

  const handleClose = (callback) => {
  setShowOffcanvas(false);
  if (callback) {
    setTimeout(callback, 350); // Wait for offcanvas animation to complete
  }
  };
  const handleShow = () => setShowOffcanvas(true);
  
  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleLogout = async () => {
      await logout();

      setLoginOutButton(false);
      setShowLogoutToast(true);
  };
  const handleHistory = () => {
    setShowHistory(true);
  }
  const navItems = [
    { name: 'Home', icon: <FiHome /> },
    { name: 'Profile', icon: <FiUser /> },
    { name: 'History / Cancel', icon: <FiRotateCcw />}
  ];
  function isTokenValid(token) {
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000); // current time in seconds
        return payload.exp > now;
    } catch (err) {
        console.error("Invalid token:", err);
        return false;
    }
  }
  return (
    <>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1100 }}>
        <Toast 
          show={showLogoutToast} 
          onClose={() => setShowLogoutToast(false)}
          delay={3000} 
          autohide
          style={{ backgroundColor: '#00c900', color: '#000c07' }}
        >
          <Toast.Body>Logged out successfully!</Toast.Body>
        </Toast>
      </ToastContainer>

      <Navbar expand="lg" className="modern-navbar py-3" variant="dark" style={{ zIndex: 1050 }}>
        <Container fluid className="px-3 px-lg-5">
          <Navbar.Brand className="d-flex align-items-center me-0 me-lg-5">
            <HiOutlineTicket 
              size={40}
              className="me-2"
              style={{
                color: '#00c900',
                backgroundColor: '#000c07',
                borderRadius: '50%',
                boxShadow: '0 0 10px #00c90033',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
            />
            <span style={{
              color: '#00c900',
              fontWeight: '800',
              fontSize: '1.75rem',
              letterSpacing: '-0.5px',
            }}>
              Bala - MBT
            </span>
          </Navbar.Brand>

          <Button 
            variant="link" 
            className="d-lg-none border-0 p-0 ms-auto"
            onClick={handleShow}
            aria-label="Toggle navigation"
          >
            <FiMenu size={24} color="#00c900" />
          </Button>

          <Navbar.Collapse id="navbar-desktop">
            <Nav className="mx-auto">
              {navItems.map(({ name, icon }) => (
                <Nav.Link
                  key={name}
                  onClick={() => {
                    if (name === 'Profile') {
                      handleProfileClick();
                    } else if (name === 'Home') {
                      navigate("/");
                    } else if (name === 'History / Cancel') {
                      handleHistory();
                    }
                  }}
                  className="nav-link-modern position-relative mx-2 px-3"
                  style={{ borderLeft: '2px solid #00c900' }}
                >
                  <span className="nav-link-text">{name}</span>
                  <span className="nav-link-icon">{icon}</span>
                  <span className="nav-link-underline"></span>
                </Nav.Link>
              ))}
            </Nav>

            <div className="d-flex align-items-center gap-3">
              {(loginOutButton || accessToken || refreshToken) && isTokenValid(refreshToken)? (
                <Button 
                  variant="success" 
                  className="contact-btn px-4 py-2"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              ) : (
                <Button 
                  variant="success" 
                  className="contact-btn px-4 py-2"
                  onClick={handleLogin}
                >
                  Login
                </Button>
              )}
              <Button variant="success" className="contact-btn px-4 py-2" onClick={() => setShowContact(true)}>
                Contact Us
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Offcanvas 
        show={showOffcanvas} 
        onHide={handleClose} 
        placement="end"
        className="modern-offcanvas"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header closeButton className="border-bottom border-dark">
          <Offcanvas.Title>
            <span style={{
              color: '#00c900',
              fontWeight: '800',
              letterSpacing: '-0.5px'
            }}>
              Bala - MBT
            </span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <Nav className="flex-column mb-auto">
            {navItems.map(({ name, icon }) => (
              <Nav.Link
                key={name}
                className="nav-link-modern position-relative px-3 d-flex align-items-center gap-2 py-3"
                onClick={() => {
                  if (name === 'Profile') {
                    handleClose(handleProfileClick);
                  } else if (name === 'Home') {
                    navigate("/");
                  } else if (name === 'History / Cancel' ){
                    handleClose(handleHistory);
                  }else {
                    handleClose();
                  }
                }}
              >
                <span className="nav-link-icon">{icon}</span>
                <span className="nav-link-text">{name}</span>
                <span className="nav-link-underline"></span>
              </Nav.Link>
            ))}
          </Nav>
          <div className="mt-auto pt-4 border-top border-dark">
            {(loginOutButton || accessToken || refreshToken) && isTokenValid(refreshToken)? (
              <Button 
                variant="success" 
                className="w-100 py-3 mb-2 contact-btn"
                onClick={() => {
                  handleLogout();
                  handleClose();
                }}
              >
                Logout
              </Button>
            ) : (
              <Button 
                variant="success" 
                className="w-100 py-3 mb-2 contact-btn"
                onClick={() => {
                  handleLogin();
                  handleClose();
                }}
              >
                Login
              </Button>
            )}
            <Button variant="success" className="w-100 py-3 contact-btn" 
              onClick= {() => {
                  handleClose();
                  setShowContact(true);
                }}>
              Contact Us
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default CustomNavbar;