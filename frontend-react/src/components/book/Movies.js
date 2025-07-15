import React, { useState, useEffect } from "react";
import { InputGroup, Container, Row, Col, Form, Card, Spinner, Alert } from "react-bootstrap";
import { FaSearch, FaFilter, FaStar, FaCalendarAlt, FaFilm, FaMapMarkerAlt } from 'react-icons/fa';
import './Movies.css';

const Movies = ({ theaterId, setMovieId, setScreenId, setShowDate, setShowTime, theaterName, theaterLocation, setMovieName, onAllSelected }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`http://localhost:5000/user/movies_shown_by_selected_theater?theater_id=${theaterId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        
        // Group screenings by movie
        const groupedMovies = data.reduce((acc, current) => {
          const existingMovie = acc.find(movie => movie.name === current.name);
              
          if (existingMovie) {
            existingMovie.screenings.push({
              screen_id: current.screen_id,
              show_time: current.show_time,
              show_date: current.show_date
            });
          } else {
            acc.push({
              ...current,
              screenings: [{
                screen_id: current.screen_id,
                show_time: current.show_time,
                show_date: current.show_date
              }]
            });
          }
          return acc;
        }, []);

        setMovies(groupedMovies);
      } catch (error) {
        console.error("Error fetching movies:", error);
        // Optionally set an error state here
      } finally {
        setIsLoading(false); // Ensure loading ends even if there's an error
      }
    };

    fetchMovies();
  }, [theaterId]);
  
  const filteredMovies = movies
    ?.filter(movie => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatches = movie?.name?.toLowerCase().includes(searchLower) || false;
      const genreMatches = movie?.genre?.toLowerCase().includes(searchLower) || false;
      return nameMatches || genreMatches;
    })
    ?.sort((a, b) => {
      const dateA = new Date(a.releasedate);
      const dateB = new Date(b.releasedate);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    }) || [];

  if (isLoading) {
    return (
      <Container fluid className="movies-section d-flex flex-column align-items-center justify-content-center">
        <Spinner animation="border" variant="success" />
        <p className="text-center">Loading movies...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="movies-section py-5">
        <Alert variant="danger" className="text-center">
          <h5>Error loading movies</h5>
          <p className="mb-0">{error}</p>
        </Alert>
      </Container>
    );
  }

  const handleScreenClick = (movieId, screenId, showDate, showTime, movieName) => {
    setMovieId(movieId);
    setScreenId(screenId);
    setShowDate(showDate);
    setShowTime(showTime);
    setMovieName(movieName);
    onAllSelected();
  }
  
  return (
    <Container fluid className="movies-section py-2">
      <Row className="justify-content-center mt-2 mb-2">
        <Col xs={12} lg={10} className="text-center">
          <div className="theater-header-centered" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
            <h1 className="theater-name-centered d-inline-block me-3"> 
              THEATER - {theaterName.toUpperCase()}
            </h1>
            <div className="theater-location-centered d-inline-block">
              <FaMapMarkerAlt className="me-2" />
              <span>{theaterLocation.toUpperCase()}</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* Search and Filter Section */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={8} lg={6} className="mb-3">
          <InputGroup>
            <InputGroup.Text className="bg-dark text-success border-success">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search movies by name or genre..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col xs={12} md={8} lg={4} className="mb-3">
          <InputGroup>
            <InputGroup.Text className="bg-dark text-success border-success">
              <FaFilter />
            </InputGroup.Text>
            <Form.Select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </Form.Select>
          </InputGroup>
        </Col>
      </Row>

      {/* Movies Grid */}
      <Row className="justify-content-center g-3">
        {filteredMovies.length > 0 ? (
          filteredMovies.map((movie) => (
            <Col key={movie.name} xs={12} lg={10} className="mb-4">
              <Card className="movie-card">
                <Card.Body className="p-0">
                  <Row className="g-0 align-items-center">
                    {/* Image Column */}
                    <Col xs={12} md={4} className="p-3">
                      <div className="movie-image-container">
                        <img
                          src={`/uploads/${movie.image}`}
                          alt={movie.name}
                          className="movie-image"
                        />
                      </div>
                    </Col>
                    
                    {/* Content Column */}
                    <Col xs={12} md={8} className="p-3">
                      <div className="movie-info-section h-100">
                        {/* Movie Details */}
                        <div className="movie-details">
                          <h3 className="movie-title mb-2">{movie.name.toUpperCase()}</h3>
                          
                          {/* Row 1: Genre & Ratings */}
                          <div className="movie-meta-row mb-1 d-flex flex-wrap gap-3">
                            <span className="movie-meta d-flex align-items-center">
                              <FaFilm className="me-2" />
                              {movie.genre.toUpperCase()}
                            </span>
                            <span className="movie-meta d-flex align-items-center">
                              <FaStar className="me-2 text-warning" />
                              {movie.ratings}/10
                            </span>
                          </div>

                          {/* Row 2: Certificate, Runtime, Release Date */}
                          <div className="movie-meta-row d-flex flex-wrap gap-3 mt-3">
                            <span className="movie-meta d-flex align-items-center">
                              {movie.certificate.toUpperCase()}
                            </span>
                            <span className="movie-meta d-flex align-items-center">
                              {movie.runtime}
                            </span>
                            <span className="movie-meta d-flex align-items-center">
                              <FaCalendarAlt className="me-2" />
                              {new Date(movie.releasedate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        
                        {/* Showtimes Section */}
                        <div className="screen-times-section mt-4">
                          <div className="screen-times-grid">
                            {movie.screenings.map((screen, index) => (
                              <div key={index} className="screen-time-card clickable-card" onClick={() => handleScreenClick(movie.id, screen.screen_id, screen.show_date, screen.show_time, movie.name)}>
                                <div className="screen-info">
                                  <FaFilm className="me-2" />
                                  <span>SCREEN {screen.screen_id}</span>
                                </div>
                                <div className="time-info">
                                  <span>{new Date(screen.show_date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }).toUpperCase()}</span>
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
            <div className="no-movies-container">
              <h3 className="no-movies-text mb-3">NO MOVIES FOUND</h3>
              <p className="text-muted">Try adjusting your search criteria or filters</p>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default Movies;