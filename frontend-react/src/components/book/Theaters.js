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
  const [hasLocation, setHasLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [locationCache, setLocationCache] = useState({});

  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLocationStatus('checking');
        
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

        // Check if geolocation is available
        if (!navigator.geolocation) {
          console.log("Geolocation is not supported by this browser");
          setLocationStatus('unavailable');
          setHasLocation(false);
          setTheaters(groupedTheaters);
          setIsLoading(false);
          return;
        }

        // Try to get location with improved error handling
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const userLat = pos.coords.latitude;
              const userLng = pos.coords.longitude;
              setHasLocation(true);
              setLocationStatus('enabled');

              // Show theaters immediately without distance, then update with distances
              setTheaters(groupedTheaters);
              setIsLoading(false);

              // Process theaters in batches to avoid rate limits and improve performance
              const batchSize = 3;
              const theatersWithDistance = [...groupedTheaters];
              
              for (let i = 0; i < groupedTheaters.length; i += batchSize) {
                const batch = groupedTheaters.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (theater, batchIndex) => {
                  try {
                    // Check cache first
                    const cacheKey = theater.location.toLowerCase().trim();
                    let tLat, tLng;
                    
                    if (locationCache[cacheKey]) {
                      tLat = locationCache[cacheKey].lat;
                      tLng = locationCache[cacheKey].lng;
                    } else {
                      // Add delay to respect rate limits
                      await new Promise(resolve => setTimeout(resolve, batchIndex * 200));
                      
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(theater.location)}`,
                        {
                          headers: {
                            'User-Agent': 'MovieBookingApp/1.0'
                          }
                        }
                      );
                      
                      if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
                      
                      const geo = await res.json();
                      if (geo.length > 0) {
                        tLat = parseFloat(geo[0].lat);
                        tLng = parseFloat(geo[0].lon);
                        
                        // Cache the result
                        setLocationCache(prev => ({
                          ...prev,
                          [cacheKey]: { lat: tLat, lng: tLng }
                        }));
                      } else {
                        return { theater, distance: Infinity, index: i + batchIndex };
                      }
                    }
                    
                    const distance = getDistanceFromLatLonInKm(userLat, userLng, tLat, tLng);
                    return { theater, distance, index: i + batchIndex };
                  } catch (err) {
                    console.error("Geocoding error for theater:", theater.name, err);
                    return { theater, distance: Infinity, index: i + batchIndex };
                  }
                });

                try {
                  const batchResults = await Promise.all(batchPromises);
                  
                  // Update theaters with distance data as we get it
                  batchResults.forEach(({ theater, distance, index }) => {
                    theatersWithDistance[index] = { ...theater, distance };
                  });

                  // Re-sort and update state after each batch
                  const sortedTheaters = [...theatersWithDistance].sort((a, b) => {
                    const aDistance = a.distance !== undefined ? a.distance : Infinity;
                    const bDistance = b.distance !== undefined ? b.distance : Infinity;
                    return aDistance - bDistance;
                  });
                  
                  setTheaters(sortedTheaters);
                } catch (err) {
                  console.error("Batch processing error:", err);
                }

                // Add delay between batches
                if (i + batchSize < groupedTheaters.length) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            } catch (err) {
              console.error("Error processing location data:", err);
              // If geocoding fails, show theaters without distance sorting
              setLocationStatus('enabled');
              setHasLocation(true);
              setTheaters(groupedTheaters);
              setIsLoading(false);
            }
          },
          (err) => {
            console.log("Location permission denied or unavailable:", err.message);
            // Handle different types of location errors
            if (err.code === err.PERMISSION_DENIED) {
              setLocationStatus('disabled');
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setLocationStatus('unavailable');
            } else {
              setLocationStatus('disabled');
            }
            
            setHasLocation(false);
            setTheaters(groupedTheaters);
            setIsLoading(false);
          },
          {
            timeout: 15000, // 15 second timeout
            enableHighAccuracy: false,
            maximumAge: 300000 // 5 minutes cache
          }
        );
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
      // Check if geolocation is available
      if (!navigator.geolocation) {
        // Fallback: Open Google Maps with just the theater location
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theater.location)}&travelmode=driving`;
        window.open(mapsUrl, '_blank');
        return;
      }

      // Get current position
      const getCurrentPosition = () => 
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve, 
            reject,
            {
              timeout: 10000,
              enableHighAccuracy: false,
              maximumAge: 300000
            }
          );
        });
      
      const pos = await getCurrentPosition();
      const userCoords = {
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude
      };

      // Get theater location
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(theater.location)}`,
        {
          headers: {
            'User-Agent': 'MovieBookingApp/1.0'
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

  const handleScreenClick = (theaterId, screenId, showDate, showTime, theaterName, theaterLocation) => {
    setTheaterId(theaterId);
    setScreenId(screenId);
    setShowDate(showDate);
    setShowTime(showTime);
    setTheaterName(theaterName);
    setTheaterLocation(theaterLocation);
    onAllSelected();
  }

  // Location status message component
  const LocationStatusMessage = () => {
    if (locationStatus === 'checking') return null;
    
    const getStatusInfo = () => {
      switch (locationStatus) {
        case 'disabled':
          return {
            variant: 'warning',
            icon: <i className="bi bi-info-circle me-2" />,
            title: 'Location Access Disabled',
            message: 'Enable location services to see theaters sorted by distance from your location.'
          };
        case 'unavailable':
          return {
            variant: 'info',
            icon: <FaLocationArrow className="me-2" />,
            title: 'Location Unavailable',
            message: 'Unable to determine your location. Theaters are shown in default order.'
          };
        case 'enabled':
          return hasLocation ? null : {
            variant: 'info',
            icon: <FaLocationArrow className="me-2" />,
            title: 'Location Processing',
            message: 'Getting your location to sort theaters by distance...'
          };
        default:
          return null;
      }
    };

    const statusInfo = getStatusInfo();
    if (!statusInfo) return null;

    return (
      <Row className="justify-content-center mb-3">
        <Col xs={12} md={10} lg={8}>
          <Alert variant={statusInfo.variant} className="text-center mb-3">
            <div className="d-flex align-items-center justify-content-center">
              {statusInfo.icon}
              <div>
                <strong>{statusInfo.title}</strong>
                <div className="small mt-1">{statusInfo.message}</div>
              </div>
            </div>
          </Alert>
        </Col>
      </Row>
    );
  };

  if (isLoading) {
    return (
      <Container fluid className="theaters-section d-flex flex-column align-items-center justify-content-center">
        <Spinner animation="border" variant="success" />
        <p className="text-center mt-3">
          {locationStatus === 'checking' ? 
            'Loading theaters and checking location...' : 
            'Loading theaters...'
          }
        </p>
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
    <Container fluid className="theaters-section py-4">
      <LocationStatusMessage />
      
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
                            {hasLocation && theater.distance !== undefined && theater.distance !== Infinity && (
                              <span className="theater-distance">
                                <FaRoad className="me-2" />
                                {Math.round(theater.distance * 10) / 10} km away
                              </span>
                            )}
                          </div>
                          
                          <div className="theater-meta-row">
                            <span className="theater-meta d-flex align-items-center gap-2">
                              <FaParking className="text-success" title="Parking Available"/>
                              {theater.parking ? 'Yes' : 'No'}
                            </span>
                            <span className="theater-meta d-flex align-items-center gap-2">
                              <FaWheelchair className="text-success" title="Accessibility Available"/>
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
