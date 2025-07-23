import React, { useState, useEffect } from "react";
import { InputGroup, Container, Row, Col, Form, Button, Card, Spinner, Alert} from "react-bootstrap";
import { FaParking, FaWheelchair, FaSearch, FaTimes, FaRoad, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Theaters.css';

const Theaters = () => {
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
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("https://movie-tickets-booking-8bn9.onrender.com/theaters");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Try to get geolocation with proper error handling
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const userLat = pos.coords.latitude;
                const userLng = pos.coords.longitude;

                // Convert location names to coordinates
                const geocodedTheaters = await Promise.all(
                  data.map(async (theater) => {
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(theater.location)}`
                      );
                      const geo = await res.json();
                      if (geo.length > 0) {
                        const tLat = parseFloat(geo[0].lat);
                        const tLng = parseFloat(geo[0].lon);
                        const distance = getDistanceFromLatLonInKm(userLat, userLng, tLat, tLng);
                        return { ...theater, distance: Math.round(distance * 10) / 10 }; // Round to 1 decimal
                      } else {
                        return { ...theater, distance: null };
                      }
                    } catch (geoError) {
                      console.error("Geocoding error for theater:", theater.name, geoError);
                      return { ...theater, distance: null };
                    }
                  })
                );

                // Sort by distance, putting theaters without distance at the end
                const sorted = geocodedTheaters.sort((a, b) => {
                  if (a.distance === null && b.distance === null) return 0;
                  if (a.distance === null) return 1;
                  if (b.distance === null) return -1;
                  return a.distance - b.distance;
                });
                
                setTheaters(sorted);
                setLocationPermissionDenied(false);
              } catch (err) {
                console.error("Error processing geolocation:", err);
                // Fallback to showing theaters without distance sorting
                const theatersWithoutDistance = data.map(theater => ({ ...theater, distance: null }));
                setTheaters(theatersWithoutDistance);
                setLocationPermissionDenied(true);
              } finally {
                setIsLoading(false);
              }
            },
            (err) => {
              console.error("Geolocation permission denied or error:", err);
              // Fallback: Show theaters in API order without distance
              const theatersWithoutDistance = data.map(theater => ({ ...theater, distance: null }));
              setTheaters(theatersWithoutDistance);
              setLocationPermissionDenied(true);
              setIsLoading(false);
            },
            {
              timeout: 10000, // 10 second timeout
              enableHighAccuracy: false,
              maximumAge: 300000 // 5 minutes cache
            }
          );
        } else {
          // Geolocation not supported
          console.log("Geolocation not supported");
          const theatersWithoutDistance = data.map(theater => ({ ...theater, distance: null }));
          setTheaters(theatersWithoutDistance);
          setLocationPermissionDenied(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch theaters:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchTheaters();
  }, []);

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
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
      // First try to get current position
      const getCurrentPosition = () => 
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 300000
          });
        });
      
      const pos = await getCurrentPosition();
      const userCoords = {
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude
      };

      // Get theater location coordinates
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(theater.location)}`,
        {
          headers: {
            'User-Agent': 'TheaterApp/1.0'
          }
        }
      );
      const geo = await res.json();
      
      if (!geo || geo.length === 0) {
        // Fallback: Use location name in Google Maps
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(theater.location)}&travelmode=driving`;
        window.open(mapsUrl, '_blank');
        return;
      }

      const theaterCoords = {
        lat: parseFloat(geo[0].lat),
        lng: parseFloat(geo[0].lon)
      };

      setOrigin(userCoords);
      setDestination(theaterCoords);

      // Open Google Maps with coordinates
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${theaterCoords.lat},${theaterCoords.lng}&travelmode=driving`;
      window.open(mapsUrl, '_blank');

    } catch(err) {
      console.error("Error getting directions:", err);
      // Fallback: Open Google Maps with just the theater location
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theater.location)}&travelmode=driving`;
      window.open(mapsUrl, '_blank');
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

  const handleBookingsFromTheaters = (theaterId, theaterName, theaterLocation) => {
    navigate(`/lookings/${theaterId}/${theaterName}/${theaterLocation}`);
  }

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
      <Container fluid className="theaters-section d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" variant="success" />
        <p className="text-center mt-3">Loading theaters...</p>
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

  return (
    <Container fluid className="theaters-section py-4 position-relative">
      {/* Location Permission Notice */}
      {locationPermissionDenied && (
        <Row className="justify-content-center mb-3">
          <Col xs={12} md={8} lg={6}>
            <Alert variant="warning" className="text-center mb-3">
              <small>
                <i className="bi bi-info-circle me-2"></i>
                Location access denied. Showing theaters without distance sorting.
              </small>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Search and Filter Section */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={4} lg={3} className="mb-3">
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

        <Col xs={12} md={4} lg={3} className="mb-3">
          <div className="d-flex gap-2 align-items-center">
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

      {/* Theaters Grid */}
      <Row className="justify-content-center g-3">
        {filteredTheaters.length > 0 ? (
          filteredTheaters.map((theater) => (
            <Col key={theater.id} xs={12} className="mb-3">
              <Card className="theater-card">
                <Card.Body className="p-0">
                  <Row className="g-0 align-items-center">
                    {/* Image Column */}
                    <Col xs={12} md="auto">
                      <div className="theater-image-container">
                        <img
                          src={theater.image ? `/uploads/${theater.image}` : `/uploads/theater_vector.png`}
                          alt={theater.name}
                          className="theater-image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/550x250/1a1a1a/00ffaa?text=Theater+Image';
                          }}
                        />
                      </div>
                    </Col>
                    
                    {/* Content Column */}
                    <Col className="d-flex flex-column p-3">
                      <div className="theater-info-section h-100">
                        {/* Theater Details */}
                        <div className="theater-details">
                          <h3 className="theater-title mb-2">{theater.name?.toUpperCase() || 'Theater Name'}</h3>
                          
                          {/* Meta Information Row */}
                          <div className="theater-meta-row">
                            <span className="theater-location">
                              <i className="bi bi-geo-alt-fill me-2"></i>
                              {theater.location?.toUpperCase() || 'Location not specified'}
                            </span>
                            {theater.distance !== null && (
                              <span className="theater-distance">
                                <FaRoad className="me-2" />
                                {theater.distance} km away
                              </span>
                            )}
                          </div>
                          
                          {/* Additional Meta Information */}
                          <div className="theater-meta-row">
                            <span className="theater-meta theater-meta-parking">
                              <span className="d-flex align-items-center gap-2">
                                <FaParking className="text-success" title="Parking Available" />
                                {theater.parking ? 'Yes' : 'No'}
                              </span>
                            </span>
                            <span className="theater-meta theater-meta-accessibility">
                              <span className="d-flex align-items-center gap-2">
                                <FaWheelchair className="text-success" title="Accessibility Available" />
                                {theater.accessibility ? 'Yes' : 'No'}
                              </span>
                            </span>
                            <span className="theater-meta theater-meta-hours">
                              <FaClock className="me-2" />
                              {theater.hours || 'Hours not specified'}
                            </span> 
                          </div>
                        </div>
                        
                        {/* Action Section - Fixed for mobile centering */}
                        <div className="theater-action-section mt-3 d-flex flex-column flex-md-row gap-2 align-items-center align-items-md-start">
                          <Button 
                            variant="primary" 
                            className="view-showtimes-btn w-100 w-md-auto" 
                            onClick={() => handleBookingsFromTheaters(theater.id, theater.name, theater.location)}
                          >
                            View Shows
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            className="directions-btn w-100 w-md-auto" 
                            onClick={() => getDirections(theater)}
                          >
                            Get Directions
                          </Button>
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
