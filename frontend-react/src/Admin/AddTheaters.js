import React, { useState } from 'react';
import { 
  Form, 
  Button, 
  Container, 
  Row, 
  Col, 
  Alert, 
  Card, 
  Accordion 
} from 'react-bootstrap';
import { useAuth } from '../components/Auth';
import AdminNavbar from './AdminNavbar';
import './AddTheaters.css';

function isTokenValid(token) {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (err) {
      return false;
    }
  }

function parseJwt(token) {
  const valid = isTokenValid(token);
  if (valid){
    try {
      const base64Payload = token.split('.')[1];
      const payload = atob(base64Payload); // decode base64
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  }
  else{
    return null;
  }
}


const AddTheaters = () => {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    parking: false,
    accessibility: false,
    image: '',
    hours: '',
    numberOfScreens: 1, 
    screens: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeScreen, setActiveScreen] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleScreenChange = (index, e) => {
  const { name, value } = e.target;
  const updatedScreens = [...formData.screens];
  updatedScreens[index] = {
    ...updatedScreens[index],
    [name]: value // Keep the raw value (could be empty string)
  };
  setFormData(prev => ({
    ...prev,
    screens: updatedScreens
  }));
  };

  const handleNumberOfScreensChange = (e) => {
  const num = parseInt(e.target.value) || 1;
  const currentScreens = formData.screens;
  const newScreens = Array(num).fill().map((_, i) => 
    currentScreens[i] || { 
      screen_name: `Screen ${i+1}`,
      elite_seats: '',
      premium_seats: '',
      elite_price: '',
      premium_price: ''
    }
  );
  
  setFormData(prev => ({
    ...prev,
    numberOfScreens: num,
    screens: newScreens
  }));
  };

  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (err) {
      console.error("Invalid token:", err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!formData.name || !formData.location) {
      setError('Theater name and location are required');
      setIsSubmitting(false);
      return;
    }

    if (formData.screens.length === 0) {
      setError('Please configure at least one screen');
      setIsSubmitting(false);
      return;
    }

    try {
      const fetchData = async (tokenToUse = accessToken, retryCount = 0) => {
        try {
          const res = await fetch('https://movie-tickets-booking-8bn9.onrender.com/admin/add-theaters', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${tokenToUse}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(formData)
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.error === "Access token expired" && retryCount < 1) {
              const refreshRes = await fetch("https://movie-tickets-booking-8bn9.onrender.com/user/refresh", {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              });

              const refreshData = await refreshRes.json();

              if (!refreshRes.ok) {
                throw new Error(refreshData.error || "Failed to refresh token");
              }

              setAccessToken(refreshData.access_token);
              return await fetchData(refreshData.access_token, retryCount + 1);
            }
            throw new Error(data.error || "Add failed");
          }
          return data;
        } catch (err) {
          console.error("AddTheaters API Error:", err);
          throw err;
        }
      };

      const result = await fetchData(accessToken);
      
      setSuccess('Theater added successfully!');
      setFormData({
        name: '',
        location: '',
        parking: false,
        accessibility: false,
        image: '',
        hours: '',
        numberOfScreens: 1,
        screens: []
      });
      
    } catch (err) {
      setError(err.message || 'An error occurred while adding the theater');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const payload = (parseJwt(refreshToken));
  if(!payload.is_admin){
    return (
      <div className="text-center mt-5">
        <h1>403 - Forbidden</h1>
        <p>You do not have permission to view this page.</p>
        <a href="/" className="btn btn-danger mt-3">Go to Home</a>
      </div>
    );
  }
  return (
    <div className="admin-theaters-container">
      <AdminNavbar />
      
      <div className="admin-theaters-overlay">
        <Container className="admin-theaters-content">
          <div className="admin-theaters-card">
            <div className="admin-theaters-card-body">
              <div className="admin-theaters-header">
                <h2 className="admin-theaters-title">Add New Theater</h2>
                <p className="admin-theaters-subtitle">Fill in the details below to add a new theater</p>
              </div>

              {error && <Alert variant="danger" className="admin-theaters-alert">{error}</Alert>}
              {success && <Alert variant="success" className="admin-theaters-alert">{success}</Alert>}

              <Form onSubmit={handleSubmit} className="admin-theaters-form">
                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Label className="admin-theaters-label">Theater Name*</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        className="admin-theaters-input"
                        placeholder="Enter theater name"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Label className="admin-theaters-label">Location*</Form.Label>
                      <Form.Control
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        className="admin-theaters-input"
                        placeholder="Enter theater location"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Label className="admin-theaters-label">Operating Hours</Form.Label>
                      <Form.Control
                        type="text"
                        name="hours"
                        value={formData.hours}
                        onChange={handleChange}
                        maxLength={25}
                        className="admin-theaters-input"
                        placeholder="e.g., 9:00 AM - 11:00 PM"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Label className="admin-theaters-label">Image URL</Form.Label>
                      <Form.Control
                        type="text"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                        maxLength={1000}
                        className="admin-theaters-input"
                        placeholder="Paste theater image URL"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Check
                        type="checkbox"
                        label="Parking Available"
                        name="parking"
                        checked={formData.parking}
                        onChange={handleChange}
                        className="admin-theaters-checkbox"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Check
                        type="checkbox"
                        label="Accessibility Features"
                        name="accessibility"
                        checked={formData.accessibility}
                        onChange={handleChange}
                        className="admin-theaters-checkbox"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-theaters-form-group">
                      <Form.Label className="admin-theaters-label">Number of Screens*</Form.Label>
                      <Form.Control
                        type="number"
                        name="numberOfScreens"
                        value={formData.numberOfScreens}
                        onChange={handleNumberOfScreensChange}
                        min="1"
                        max="20"
                        required
                        className="admin-theaters-input"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="admin-screens-section">
                  <h4 className="admin-screens-title">Screen Configuration</h4>
                  <p className="admin-screens-subtitle">Configure each screen below</p>
                  
                  <Accordion activeKey={activeScreen} onSelect={setActiveScreen}>
                    {Array.from({ length: formData.numberOfScreens }).map((_, index) => (
                      <Accordion.Item key={index} eventKey={index.toString()} className="admin-screen-card">
                        <Accordion.Header>
                          Screen {index + 1} {formData.screens[index]?.screen_name && `- ${formData.screens[index].screen_name}`}
                        </Accordion.Header>
                        <Accordion.Body>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="admin-theaters-form-group">
                                <Form.Label className="admin-theaters-label">Screen Name</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="screen_name"
                                  value={formData.screens[index]?.screen_name || `Screen ${index + 1}`}
                                  onChange={(e) => handleScreenChange(index, e)}
                                  maxLength={30}
                                  className="admin-theaters-input"
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="admin-theaters-form-group">
                                <Form.Label className="admin-theaters-label">Elite Seats</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="elite_seats"
                                  value={formData.screens[index]?.elite_seats}
                                  onChange={(e) => handleScreenChange(index, e)}
                                  min="0"
                                  className="admin-theaters-input"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="admin-theaters-form-group">
                                <Form.Label className="admin-theaters-label">Elite Price ($)</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="elite_price"
                                  value={formData.screens[index]?.elite_price}
                                  onChange={(e) => handleScreenChange(index, e)}
                                  min="0"
                                  step="0.01"
                                  className="admin-theaters-input"
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="admin-theaters-form-group">
                                <Form.Label className="admin-theaters-label">Premium Seats</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="premium_seats"
                                  value={formData.screens[index]?.premium_seats}
                                  onChange={(e) => handleScreenChange(index, e)}
                                  min="0"
                                  className="admin-theaters-input"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="admin-theaters-form-group">
                                <Form.Label className="admin-theaters-label">Premium Price ($)</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="premium_price"
                                  value={formData.screens[index]?.premium_price}
                                  onChange={(e) => handleScreenChange(index, e)}
                                  min="0"
                                  step="0.01"
                                  className="admin-theaters-input"
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </div>

                <Button 
                  variant="success" 
                  type="submit"
                  className="admin-theaters-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding Theater...' : 'Add Theater'}
                </Button>
              </Form>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default AddTheaters;