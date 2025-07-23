import { Container, Row, Col } from 'react-bootstrap';
import { FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="modern-footer">
      <Container>
        <Row className="g-4 justify-content-center">
          {/* Contact Info - Responsive Grid */}
          <Col xs={12}>
            <Row className="justify-content-center">
              <Col xs={12} md={4} className="text-center mb-3 mb-md-0">
                <div className="info footer-item d-flex justify-content-center">
                  <FaEnvelope className="footer-icon mt-1" />
                  <a href="mailto:contact@balamtb.com" className="footer-link">contact@balamtb.com</a>
                </div>
              </Col>

              <Col xs={12} md={4} className="text-center mb-3 mb-md-0">
                <div className="info footer-item d-flex justify-content-center">
                  <FaPhone className="footer-icon mt-1" />
                  <a href="tel:+919876543210" className="footer-link">+91 98765 43210</a>
                </div>
              </Col>

              <Col xs={12} md={4} className="text-center">
                <div className="info footer-item d-flex justify-content-center">
                  <FaGlobe className="footer-icon mt-1" />
                  <a href="https://www.balamtb.com" target="_blank" rel="noopener noreferrer" className="footer-link">www.balamtb.com</a>
                </div>
              </Col>
            </Row>
          </Col>

          {/* Address - Centered */}
          <Col xs={12} className="text-center mt-3">
            <div className="footer-item d-flex justify-content-center">
              <FaMapMarkerAlt className="footer-icon mt-1" />
              <span className="footer-text">123, Cine Street, Chennai, Tamil Nadu - 600001</span>
            </div>
          </Col>

          {/* Copyright - Centered */}
          <Col xs={12} className="text-center mt-4">
            <div className="copyright-text">
              © {new Date().getFullYear()} DbaasT. All rights reserved.
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
