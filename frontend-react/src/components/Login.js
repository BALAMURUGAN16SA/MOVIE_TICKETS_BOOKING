import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, CloseButton, Toast, ToastContainer } from 'react-bootstrap';
import { FaGoogle, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from './Auth';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from "react-router-dom";
import './Login.css';

const Login = ({ onLogin, onClose, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState(0);
  const { setAccessToken, setRefreshToken } = useAuth();
  const navigate = useNavigate();
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const hashedPassword = await hashPassword(password);
      const submissionData = {
        email: email,
        password: hashedPassword,
      };

      const res = await fetch('https://movie-tickets-booking-8bn9.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Login failed');
      } else {
        setAccessToken(data['access_token']);
        setRefreshToken(data['refresh_token']);
        setLoginStatus(1);
        const decoded = jwtDecode(data['access_token']);
        if (decoded.is_admin) {
          navigate("/admin-dashboard");
        }
        setTimeout(() => {
          onClose(true);
        }, 1000);
      }
    } catch {
      setLoginStatus(-1);
    }
  };

  useEffect(() => {
    setEmail("user001@gmail.com");
    setPassword("user001");
  }, []);

  return (
    <>
      <div className="login-overlay">
        <Container className="login-container">
          <Card className="login-card">
            <Card.Body className="login-card-body">
              <CloseButton 
                variant="white" 
                className="login-close-btn" 
                onClick={() => onClose(false)}
              />

              <div className="login-header">
                <h2 className="login-title">Welcome Back</h2>
                <p className="login-subtitle">Please enter your details to sign in</p>
              </div>

              <Form onSubmit={handleSubmit} className="login-form">
                <Form.Group className="login-form-group">
                  <Form.Label className="login-label">Email</Form.Label>
                  <div className="login-input-group">
                    <span className="login-input-icon">
                      <FaUser className="login-icon" />
                    </span>
                    <Form.Control
                      type="text"
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="login-input"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="login-form-group">
                  <Form.Label className="login-label">Password</Form.Label>
                  <div className="login-input-group position-relative">
                    <span className="login-input-icon">
                      <FaLock className="login-icon" />
                    </span>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="login-input"
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        color: '#555'
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </Form.Group>


                <Button
                  type="submit"
                  className="login-btn"
                >
                  Sign In
                </Button>

                <div className="login-register-text">
                  <span style={{color: '#00c900'}}>Quick demo?</span> Use the guest credentials above.
                </div>

                <div className="login-divider">
                  <hr className="login-divider-line" />
                  <hr className="login-divider-line" />
                </div>

                <div className="login-register-text">
                  Not registered?{' '}
                  <Button 
                    variant="link" 
                    className="login-register-link"
                    onClick={onRegisterClick}
                  >
                    Create an account
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>
      
      {/* Only show Toast when needed */}
      {loginStatus !== 0 && (
        <ToastContainer position="top-end" className="p-3">
          <Toast
            onClose={() => setLoginStatus(0)}
            show={true}
            delay={3000}
            autohide
            style={{
              backgroundColor: loginStatus === 1 ? '#00c900' : '#dc3545',
              color: '#fff'
            }}
          >
            <Toast.Body>
              {loginStatus === 1 ? 'Logged in successfully!' : 'Incorrect email or password!'}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      )}
    </>
  );
};

export default Login;