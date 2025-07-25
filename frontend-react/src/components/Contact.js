import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { HiOutlineTicket } from 'react-icons/hi2';
import './Contact.css';

const Contact = ({ setShowContact }) => {
  return (
    <div className="contact-overlay">
      <Container className="contact-container">
        <div className="contact-card">
          <div className="contact-card-body">
            {/* Close Button */}
            <button className="contact-close-btn" onClick={() => setShowContact(false)}>
              <FaTimes />
            </button>

            {/* Header Section */}
            <div className="contact-header">
              <div className="contact-icon-container">
                <HiOutlineTicket className="contact-main-icon" />
              </div>
              <h1 className="contact-title">Contact Bala - MTB</h1>
            </div>

            {/* Contact Details */}
            <div className="contact-details">
              <Row>
                {/* Phone */}
                <Col xs={12} className="mb-3">
                  <div className="contact-detail-item">
                    <div className="contact-detail-label">
                      <FaPhone className="contact-detail-icon" />
                      <span>Phone</span>
                    </div>
                    <div className="contact-detail-value">
                      +91 98765 43210
                    </div>
                  </div>
                </Col>

                {/* Email */}
                <Col xs={12} className="mb-3">
                  <div className="contact-detail-item">
                    <div className="contact-detail-label">
                      <FaEnvelope className="contact-detail-icon" />
                      <span>Email</span>
                    </div>
                    <div className="contact-detail-value">
                      contact@balamtb.com
                    </div>
                  </div>
                </Col>

                {/* Address */}
                <Col xs={12} className="mb-3">
                  <div className="contact-detail-item">
                    <div className="contact-detail-label">
                      <FaMapMarkerAlt className="contact-detail-icon" />
                      <span>Corporate Office</span>
                    </div>
                    <div className="contact-detail-value">
                      123, Cine Street<br />
                      Chennai, Tamil Nadu - 600001
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Contact;