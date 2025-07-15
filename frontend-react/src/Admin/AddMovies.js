import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { useAuth } from '../components/Auth';
import AdminNavbar from './AdminNavbar';
import './AddMovies.css'; // We'll create this CSS file

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


const AddMovies = () => {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    releasedate: '',
    runtime: '',
    genre: '',
    description: '',
    ratings: '',
    image: '',
    certificate: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    if (!formData.name) {
      setError('Movie name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const fetchData = async (tokenToUse = accessToken, retryCount = 0) => {
        try {
          const res = await fetch('http://localhost:5000/admin/add-movies', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${tokenToUse}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              ...formData,
              runtime: formData.runtime ? `${formData.runtime}:00` : null,
              ratings: formData.ratings ? parseFloat(formData.ratings) : null
            })
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.error === "Access token expired" && retryCount < 1) {
              const refreshRes = await fetch("http://localhost:5000/user/refresh", {
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
          console.error("AddMovies API Error:", err);
          throw err;
        }
      };

      const addMovie = await fetchData(accessToken);
      
      setSuccess('Movie added successfully!');
      setFormData({
        name: '',
        releasedate: '',
        runtime: '',
        genre: '',
        description: '',
        ratings: '',
        image: '',
        certificate: ''
      });
      
    } catch (err) {
      setError(err.message || 'An error occurred while adding the movie');
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
    <div className="admin-movies-container">
      <AdminNavbar />
      
      <div className="admin-movies-overlay">
        <Container className="admin-movies-content">
          <div className="admin-movies-card">
            <div className="admin-movies-card-body">
              <div className="admin-movies-header">
                <h2 className="admin-movies-title">Add New Movie</h2>
                <p className="admin-movies-subtitle">Fill in the details below to add a new movie</p>
              </div>

              {error && <Alert variant="danger" className="admin-movies-alert">{error}</Alert>}
              {success && <Alert variant="success" className="admin-movies-alert">{success}</Alert>}

              <Form onSubmit={handleSubmit} className="admin-movies-form">
                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Movie Name*</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          maxLength={40}
                          required
                          className="admin-movies-input"
                          placeholder="Enter movie name"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Release Date</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="date"
                          name="releasedate"
                          value={formData.releasedate}
                          onChange={handleChange}
                          className="admin-movies-input"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Runtime (HH:MM)</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="text"
                          name="runtime"
                          value={formData.runtime}
                          onChange={handleChange}
                          placeholder="02:30 for 2 hours 30 minutes"
                          pattern="^\d{1,2}:\d{2}$"
                          className="admin-movies-input"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Genre</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="text"
                          name="genre"
                          value={formData.genre}
                          onChange={handleChange}
                          maxLength={25}
                          className="admin-movies-input"
                          placeholder="e.g., Action, Drama"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="admin-movies-form-group">
                  <Form.Label className="admin-movies-label">Description</Form.Label>
                  <div className="admin-movies-input-group">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      maxLength={250}
                      className="admin-movies-input"
                      placeholder="Brief description of the movie"
                    />
                  </div>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Ratings (0-10)</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="number"
                          name="ratings"
                          value={formData.ratings}
                          onChange={handleChange}
                          min="0"
                          max="10"
                          step="0.1"
                          className="admin-movies-input"
                          placeholder="e.g., 8.5"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-movies-form-group">
                      <Form.Label className="admin-movies-label">Certificate</Form.Label>
                      <div className="admin-movies-input-group">
                        <Form.Control
                          type="text"
                          name="certificate"
                          value={formData.certificate}
                          onChange={handleChange}
                          maxLength={10}
                          className="admin-movies-input"
                          placeholder="e.g., PG-13"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="admin-movies-form-group">
                  <Form.Label className="admin-movies-label">Image URL</Form.Label>
                  <div className="admin-movies-input-group">
                    <Form.Control
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      className="admin-movies-input"
                      placeholder="Paste image URL here"
                    />
                  </div>
                </Form.Group>

                <Button 
                  variant="success" 
                  type="submit"
                  className="admin-movies-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Movie'}
                </Button>
              </Form>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default AddMovies;