import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, Offcanvas } from 'react-bootstrap';
import { FiMenu, FiHome, FiPlusSquare, FiMapPin, FiCalendar } from 'react-icons/fi';
import { HiOutlineTicket } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/Auth';
import '../components/CustomNavbar.css'

const AdminNavbar = () => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const navigate = useNavigate();
  const { refreshToken } = useAuth();
  const handleClose = () => setShowOffcanvas(false);
  const handleShow = () => setShowOffcanvas(true);
  
  const navItems = [
    { name: 'Home', icon: <FiHome />, action: () => navigate("/admin-dashboard") },
    { name: 'Add Movies', icon: <FiPlusSquare />, action: () => navigate("/admin-dashboard/add-movies") },
    { name: 'Add Theaters', icon: <FiMapPin />, action: () => navigate("/admin-dashboard/add-theaters") },
    { name: 'Add Shows', icon: <FiCalendar />, action: () => navigate("/admin-dashboard/add-shows") },
  ];

  function isTokenValid(token) {
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
    } catch (err) {
        console.error("Invalid token:", err);
        return false;
    }
  }

  return (
    <>
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
              onClick={() => navigate("/admin")}
            />
            <span style={{
              color: '#00c900',
              fontWeight: '800',
              fontSize: '1.75rem',
              letterSpacing: '-0.5px',
            }}>
              inAdmin
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
              {navItems.map(({ name, icon, action }) => (
                <Nav.Link
                  key={name}
                  onClick={action}
                  className="nav-link-modern position-relative mx-2 px-3"
                  style={{ borderLeft: '2px solid #00c900' }}
                >
                  <span className="nav-link-text">{name}</span>
                  <span className="nav-link-icon">{icon}</span>
                  <span className="nav-link-underline"></span>
                </Nav.Link>
                
              ))}
            </Nav>
            <div className="mt-auto pt-4 border-top border-dark">
              {isTokenValid(refreshToken) ? (
                <Button 
                  variant="success" 
                  className="w-100 py-2 mb-2 contact-btn"
                  onClick={() => {
                    navigate("/");
                  }}
                >
                  HeroSection
                </Button>
              ) : (
                navigate("/")
              )}
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
              Bala - MBT Admin
            </span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <Nav className="flex-column mb-auto">
            {navItems.map(({ name, icon, action }) => (
              <Nav.Link
                key={name}
                className="nav-link-modern position-relative px-3 d-flex align-items-center gap-2 py-3"
                onClick={() => {
                  action();
                  handleClose();
                }}
              >
                <span className="nav-link-icon">{icon}</span>
                <span className="nav-link-text">{name}</span>
                <span className="nav-link-underline"></span>
              </Nav.Link>
            ))}
          </Nav>
          <div className="mt-auto pt-4 border-top border-dark">
              {isTokenValid(refreshToken) ? (
                <Button 
                  variant="success" 
                  className="w-100 py-2 mb-2 contact-btn"
                  onClick={() => {
                    navigate("/");
                    handleClose();
                  }}
                >
                  HeroSection
                </Button>
              ) : (
                navigate("/")
              )}
            </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default AdminNavbar;