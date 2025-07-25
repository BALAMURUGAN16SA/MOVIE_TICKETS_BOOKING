import React, { useState } from 'react';
import { Container, Form, Button, Card, CloseButton, Alert,  Toast, ToastContainer } from 'react-bootstrap';
import { FaGoogle, FaLock, FaUser, FaMapMarkerAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Register.css';

const Register = ({ onRegister, onClose, onLoginClick }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    location: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showErrorToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationFetch = () => {
  if (navigator.geolocation) {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          // Reverse geocode using OpenStreetMap Nominatim
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: {
              "User-Agent": "YourAppName/1.0 (your@email.com)"
            }
          });
          const data = await response.json();

          const placeName = data.display_name || `${lat}, ${lon}`;

          setFormData(prev => ({
            ...prev,
            location: placeName
          }));
        } catch (error) {
          console.error("Error fetching address:", error);
          setFormData(prev => ({
            ...prev,
            location: `${lat}, ${lon}`
          }));
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setErrors(prev => ({
          ...prev,
          location: "Location access denied or unavailable"
        }));
        setLocationLoading(false);
      }
    );
  } else {
    setErrors(prev => ({
      ...prev,
      location: "Geolocation is not supported by your browser"
    }));
  }
  };

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        const firstError = Object.values(newErrors)[0];
        showErrorToast(firstError);
        return false;
    }

  return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
        setIsLoading(true);
        try {
            const hashedPassword = await hashPassword(formData.password);
            const submissionData = {
                ...formData,
                password: hashedPassword,
                confirmPassword: undefined
            };

            const res = await fetch('https://movie-tickets-booking-8bn9.onrender.com/user/register', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.details || data.error || 'Registration failed');
            }
            showErrorToast('200 - Registered Successfully! Login with same credentials to continue!');
            setTimeout(() => {onLoginClick();}, 3000);
        } catch (err) {
            console.error('Registration failed:', err);
            showErrorToast(
                err.message.includes('duplicate key') 
                ? 'This email is already registered. Please use a different email.'
                : err.message || 'Something went wrong! Please try again.'
            );
        } finally {
        setIsLoading(false);
        }
    }
  };

  const handleGoogleAuth = () => {
    // Implement OAuth with Google
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  return (
    <div className="register-overlay">
      <Container className="register-container">
        <Card className="register-card">
          <Card.Body className="register-card-body">
            <CloseButton 
              variant="white" 
              className="register-close-btn" 
              onClick={onClose}
            />
            
            <div className="register-header">
              <h2 className="register-title">Create Account</h2>
              <p className="register-subtitle">Join us to get started</p>
            </div>

            {errors.general && (
              <Alert variant="danger" className="register-alert">
                {errors.general}
              </Alert>
            )}

            <Form onSubmit={handleSubmit} className="register-form">
              <Form.Group className="register-form-group">
                <Form.Label className="register-label">Email</Form.Label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <FaUser className="register-icon" />
                  </span>
                  <Form.Control
                    type="text"
                    name="email"
                    placeholder="Enter Email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    className="register-input"
                  />
                </div>
                {errors.email && (
                  <Form.Control.Feedback type="invalid" className="register-error">
                    {errors.email}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              <Form.Group className="register-form-group">
                  <Form.Label className="register-label">Password</Form.Label>
                  <div className="register-input-group position-relative">
                    <span className="register-input-icon">
                      <FaLock className="register-icon" />
                    </span>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create password"
                      value={formData.password}
                      onChange={handleChange}
                      isInvalid={!!errors.password}
                      className="register-input"
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#555"
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  {errors.password && (
                    <Form.Control.Feedback type="invalid" className="register-error">
                      {errors.password}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>


              <Form.Group className="register-form-group">
                <Form.Label className="register-label">Confirm Password</Form.Label>
                <div className="register-input-group position-relative">
                  <span className="register-input-icon">
                    <FaLock className="register-icon" />
                  </span>
                  <Form.Control
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    isInvalid={!!errors.confirmPassword}
                    className="register-input"
                  />
                  <span
                    className="password-toggle-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#555"
                    }}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {errors.confirmPassword && (
                  <Form.Control.Feedback type="invalid" className="register-error">
                    {errors.confirmPassword}
                  </Form.Control.Feedback>
                )}
              </Form.Group>


              <Form.Group className="register-form-group">
                <Form.Label className="register-label">
                  Location
                  <Button 
                    variant="link" 
                    className="register-location-btn"
                    onClick={handleLocationFetch}
                    disabled={locationLoading}
                  >
                    {locationLoading ? 'Detecting...' : 'Auto-detect'}
                  </Button>
                </Form.Label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <FaMapMarkerAlt className="register-icon" />
                  </span>
                  <Form.Control
                    type="text"
                    name="location"
                    placeholder="Your location"
                    value={formData.location}
                    onChange={handleChange}
                    isInvalid={!!errors.location}
                    className="register-input"
                  />
                </div>
                {errors.location && (
                  <Form.Control.Feedback type="invalid" className="register-error">
                    {errors.location}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              <Button
                type="submit"
                className="register-btn"
                disabled={isLoading}
                
              >
                {isLoading ? 'Creating account...' : 'Register'}
              </Button>
              
              <div className="register-login-text">
                  Quick demo? Use the guest credentials in login.
              </div>

              <div className="register-divider">
                <hr className="register-divider-line" />
                <hr className="register-divider-line" />
              </div>

              <div className="register-login-text">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  className="register-login-link"
                  onClick={onLoginClick}
                >
                  Sign in
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
            show={showToast} 
            onClose={() => setShowToast(false)} 
            delay={5000} 
            autohide 
            bg={toastMessage.startsWith('200') ? 'success' : 'danger'}
        >
            <Toast.Header>
            <strong className="me-auto">
                {toastMessage.startsWith('200') ? 'Success' : 'Error'}
            </strong>
            <small>Just now</small>
            </Toast.Header>
            <Toast.Body className="text-white">
            {toastMessage}
            </Toast.Body>
        </Toast>
      </ToastContainer>

    </div>
  );
};

export default Register;