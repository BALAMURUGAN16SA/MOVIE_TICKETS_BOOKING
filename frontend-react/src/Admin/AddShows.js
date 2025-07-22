import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { useAuth } from '../components/Auth';
import AdminNavbar from './AdminNavbar';
import './AddShows.css';

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


const AddShows = () => {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const [formData, setFormData] = useState({
    theater_id: '',
    movie_id: '',
    screen_id: '',
    show_date: '',
    show_time: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theaters, setTheaters] = useState([]);
  const [movies, setMovies] = useState([]);
  const [screens, setScreens] = useState([]);

  // Fetch theaters and movies on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const theatersRes = await fetch('https://movie-tickets-booking-8bn9.onrender.com/admin/theaters');
        const theatersData = await theatersRes.json();
        setTheaters(theatersData);

        const moviesRes = await fetch('https://movie-tickets-booking-8bn9.onrender.com/admin/movies');
        const moviesData = await moviesRes.json();
        setMovies(moviesData);

      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError('Failed to load theaters and movies');
      }
    };

    fetchInitialData();
  }, []);

  // Fetch screens when theater_id changes
  useEffect(() => {
    const fetchScreens = async () => {
      if (!formData.theater_id) {
        setScreens([]);
        setFormData(prev => ({ ...prev, screen_id: '' }));
        return;
      }

      try {
        const screensRes = await fetch(`https://movie-tickets-booking-8bn9.onrender.com/admin/screensoftheater?theater_id=${formData.theater_id}`);
        const screensData = await screensRes.json();
        setScreens(screensData);
        console.log(screensData)
        // Reset screen_id if it's no longer valid for the new theater
        if (screensData.every(screen => screen.id !== formData.screen_id)) {
          setFormData(prev => ({ ...prev, screen_id: '' }));
        }
      } catch (err) {
        console.error("Error fetching screens:", err);
        setError('Failed to load screens for selected theater');
      }
    };

    fetchScreens();
  }, [formData.theater_id, accessToken]);

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

    // Basic validation
    if (!formData.theater_id || !formData.movie_id || !formData.screen_id || 
        !formData.show_date || !formData.show_time) {
      setError('All fields are required');
      setIsSubmitting(false);
      return;
    }

    try {
      const fetchData = async (tokenToUse = accessToken, retryCount = 0) => {
        try {
          const res = await fetch('https://movie-tickets-booking-8bn9.onrender.com/admin/add-shows', {
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
          console.error("AddShows API Error:", err);
          throw err;
        }
      };

      await fetchData(accessToken);
      
      setSuccess('Show added successfully!');
      setFormData({
        theater_id: '',
        movie_id: '',
        screen_id: '',
        show_date: '',
        show_time: '',
      });
      
    } catch (err) {
      setError(err.message || 'An error occurred while adding the show');
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
    <div className="admin-shows-container">
      <AdminNavbar />
      
      <div className="admin-shows-overlay">
        <Container className="admin-shows-content">
          <div className="admin-shows-card">
            <div className="admin-shows-card-body">
              <div className="admin-shows-header">
                <h2 className="admin-shows-title">Add New Show</h2>
                <p className="admin-shows-subtitle">Fill in the details below to add a new show</p>
              </div>

              {error && <Alert variant="danger" className="admin-shows-alert">{error}</Alert>}
              {success && <Alert variant="success" className="admin-shows-alert">{success}</Alert>}

              <Form onSubmit={handleSubmit} className="admin-shows-form">
                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-shows-form-group">
                      <Form.Label className="admin-shows-label">Theater*</Form.Label>
                      <Form.Select
                        name="theater_id"
                        value={formData.theater_id}
                        onChange={handleChange}
                        required
                        className="admin-shows-input"
                      >
                        <option value="" className="shop">Select Theater</option>
                        {theaters.map(theater => (
                          <option key={theater.id} value={theater.id} style={{backgroundColor: '#000c07'}}>
                            {theater.id} - {theater.name.toUpperCase()}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-shows-form-group">
                      <Form.Label className="admin-shows-label">Movie*</Form.Label>
                      <Form.Select
                        name="movie_id"
                        value={formData.movie_id}
                        onChange={handleChange}
                        required
                        className="admin-shows-input"
                      >
                        <option value="" className="shop">Select Movie</option>
                        {movies.map(movie => (
                          <option key={movie.id} value={movie.id} style={{backgroundColor: '#000c07'}}>
                            {movie.id} - {movie.name.toUpperCase()}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="admin-shows-form-group">
                      <Form.Label className="admin-shows-label">Screen*</Form.Label>
                      <Form.Select
                        name="screen_id"
                        value={formData.screen_id}
                        onChange={handleChange}
                        required
                        className="admin-shows-input"
                        disabled={!formData.theater_id}
                      >
                        <option value="" className="shop"> {formData.theater_id ? 'Select Screen' : 'Select Theater first'}</option>
                        {screens.map(screen => (
                          <option key={screen.screen_id} value={screen.screen_id} style={{backgroundColor: '#000c07'}}>
                            {screen.screen_name} (Capacity: {screen.elite_seats} : {screen.premium_seats})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="admin-shows-form-group">
                      <Form.Label className="admin-shows-label">Show Date*</Form.Label>
                      <Form.Control
                        type="date"
                        name="show_date"
                        value={formData.show_date}
                        onChange={handleChange}
                        required
                        className="admin-shows-input"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="admin-shows-form-group">
                  <Form.Label className="admin-shows-label">Show Time* HH:MM:SS</Form.Label>
                  <Form.Control
                    type="time"
                    name="show_time"
                    step="1"
                    value={formData.show_time}
                    onChange={handleChange}
                    required
                    className="admin-shows-input"
                  />
                </Form.Group>

                <Button 
                  variant="success" 
                  type="submit"
                  className="admin-shows-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Show'}
                </Button>
              </Form>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default AddShows;