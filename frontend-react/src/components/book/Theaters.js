import React, { useState, useEffect } from "react";
import { InputGroup, Container, Row, Col, Form, Button, Card, Spinner, Alert } from "react-bootstrap";
import { FaParking, FaWheelchair, FaSearch, FaTimes, FaMapMarkerAlt, FaRoad, FaClock, FaFilm, FaCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Theaters.css';

const Theaters = ({movieId, movieName, movieDate, setTheaterId, setScreenId, setShowDate, setShowTime, setTheaterName, setTheaterLocation, onAllSelected}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    parking: false,
    accessibility: false
  });
  const [theaters, setTheaters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`https://movie-tickets-booking-8bn9.onrender.com/user/theaters_showing_selected_movie?movie_id=${movieId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Group screens by theater
        const groupedTheaters = data.reduce((acc, current) => {
          const existingTheater = acc.find(theater => theater.id === current.id);
          
          if (existingTheater) {
            existingTheater.screens.push({
              screen_id: current.screen_id,
              show_date: current.show_date,
              show_time: current.show_time
            });
          } else {
            acc.push({
              ...current,
              screens: [{
                screen_id: current.screen_id,
                show_date: current.show_date,
                show_time: current.show_time
              }]
            });
          }
          return acc;
        }, []);

        // Set theaters directly without location-based sorting
        setTheaters(groupedTheaters);
        setIsLoading(false);
        
      } catch (err) {
        console.error("Failed to fetch theaters:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchTheaters();
  }, [movieId]);

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  async function getDirections(theater) {
    try {
      // 1. Get current position
      const getCurrentPosition = () => 
        new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      
      const pos = await getCurrentPosition();
      const userCoords = {
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude
      };

      // 2. Get theater location
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(theater.location)}`,
        {
          headers: {
            'User-Agent': 'localhost' // Required by Nominatim
          }
        }
      );
      const geo = await res.json();
      
      if (!geo || geo.length === 0) {
        throw new Error('Theater location not found');
      }

      const theaterCoords = {
        lat: parseFloat(geo[0].lat),
        lng: parseFloat(geo[0].lon)
      };

      setOrigin(userCoords);
      setDestination(theaterCoords);

      // 4. Immediately open Google Maps with the coordinates we just got
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${theaterCoords.lat},${theaterCoords.lng}&travelmode=driving`;
      window.open(mapsUrl, '_blank');

    } catch(err) {
      console.error("Error getting directions:", err);
    }
  }

  const toggleFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const clearFilters = () => {
    setFilters({
      parking: false,
      accessibility: false
    });
  };

  const filteredTheaters = theaters
    ?.filter(theater => {
      const searchLower = searchTerm.toLowerCase();
      return (
        theater?.name?.toLowerCase().includes(searchLower) || 
        theater?.location?.toLowerCase().includes(searchLower)
      );
    })
    ?.filter(theater => {
      if (!filters.parking && !filters.accessibility) return true;
      return (
        (!filters.parking || theater.parking) &&
        (!filters.accessibility || theater.accessibility)
      );
    }) || [];

  if (isLoading) {
    return (
      <Container fluid className="theaters-section d-flex flex-column align-items-center justify-content-center">
        <Spinner animation="border" variant="success" />
        <p className="text-center">Loading theaters...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="theaters-section py-5">
        <Alert variant="danger" className="text-center">
          <h5>Error loading theaters</h5>
          <p className="mb-0">{error}</p>
        </Alert>
      </Container>
    );
  }

  const handleScreenClick = (theaterId, screenId, showDate, showTime, theaterName, theaterLocation) => {
    setTheaterId(theaterId);
    setScreenId(screenId);
    setShowDate(showDate);
    setShowTime(showTime);
    setTheaterName(theaterName);
    setTheaterLocation(theaterLocation);
    onAllSelected();
  }

  return (
    <Container fluid className="theaters-section py-4">
      <Row className="justify-content-center mt-2 mb-2">
        <Col xs={12} lg={10} className="text-center">
          <div className="movie-header-centered" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
            <h1 className="movie-name-centered d-inline-block me-3">
              MOVIE - {movieName}
            </h1>
            <div className="movie-location-centered d-inline-block">
              <FaCalendarAlt className="me-2" />
              <span>{movieDate.split("-")[0]}</span>
            </div>
          </div>
        </Col>
      </Row>
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={8} lg={6} className="mb-3">
          <InputGroup>
            <InputGroup.Text className="bg-dark text-success border-success">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search theaters by name or location..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>

        <Col xs={12} md={8} lg={4} className="mb-3">
          <div className="d-flex gap-2 align-items-center justify-content-center">
            <Button
              variant={filters.parking ? "success" : "outline-success"}
              onClick={() => toggleFilter("parking")} 
              className="filter-button"
            >
              <FaParking className="me-2" />
              Parking
            </Button>
            <Button
              variant={filters.accessibility ? "success" : "outline-success"}
              onClick={() => toggleFilter("accessibility")}
              className="filter-button"
            >
              <FaWheelchair className="me-2" />
              Accessible
            </Button>
            
            {(filters.parking || filters.accessibility) && (
              <Button
                variant="link"
                className="text-danger p-0 ms-2"
                onClick={clearFilters}
                title="Clear filters"
              >
                <FaTimes />
              </Button>
            )}
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center g-3">
        {filteredTheaters.length > 0 ? (
          filteredTheaters.map((theater) => (
            <Col key={theater.id} xs={12} lg={10} className="mb-4">
              <Card className="theater-card">
                <Card.Body className="p-0">
                  <Row className="g-0 align-items-center">
                    <Col xs={12} md={4} className="p-3">
                      <div className="theater-image-container-new">
                        <img
                          src={theater.image ? `/uploads/${theater.image}` : `/uploads/theater_vector.png`}
                          alt={theater.name}
                          className="theater-image-new"
                        />
                      </div>
                    </Col>
                    
                    <Col xs={12} md={8} className="p-3">
                      <div className="theater-info-section h-100">
                        <div className="theater-details">
                          <h3 className="theater-title mb-2">{theater.name.toUpperCase()}</h3>
                          
                          <div className="theater-meta-row">
                            <span className="theater-meta">
                              <FaMapMarkerAlt className="me-2" />
                              {theater.location.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="theater-meta-row">
                            <span className="theater-meta d-flex align-items-center gap-2">
                              <FaParking className="text-success" title="Parking Available"/>
                              {theater.parking ? 'Yes' : 'No'}
                            </span>
                            <span className="theater-meta d-flex align-items-center gap-2">
                              <FaWheelchair className="text-success" title="Accesibility Available"/>
                              {theater.accessibility ? 'Yes' : 'No'}
                            </span>
                            <span className="theater-meta d-flex align-items-center gap-2">
                              <FaClock className="" />
                              {theater.hours || 'Hours not specified'}
                            </span>
                              <Button 
                                className="ms-3 directions-btn"
                                onClick={() => getDirections(theater)}
                              >
                                Get Directions
                              </Button>
                          </div>
                        </div>
                        
                        <div className="screen-times-section mt-4">
                          <div className="screen-times-grid">
                            {theater.screens.map((screen, index) => (
                              <div key={index} className="screen-time-card clickable-card" onClick={() => handleScreenClick(theater.id, screen.screen_id, screen.show_date, screen.show_time, theater.name, theater.location)}>
                                <div className="screen-info">
                                  <FaFilm className="me-2" />
                                  <span>Screen {screen.screen_id}</span>
                                </div>
                                <div className="time-info">
                                  <span>{new Date(screen.show_date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</span>
                                  <span className="mx-2">•</span>
                                  <span>{screen.show_time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12} className="text-center py-5">
            <div className="no-theaters-container">
              <h3 className="no-theaters-text mb-3">No theaters found</h3>
              <p className="text-muted">Try adjusting your search criteria or filters</p>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default Theaters;
