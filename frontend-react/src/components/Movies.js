import React, { useState, useEffect } from "react";
import { InputGroup, Container, Row, Col, Form, Button, Card, Spinner, Alert} from "react-bootstrap";
import { FaSearch, FaFilter } from 'react-icons/fa';
import './Movies.css';
import { useNavigate } from "react-router-dom";
const Movies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch("https://movie-tickets-booking-8bn9.onrender.com/");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMovies(data);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);
  
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

  const handleBookingsFromMovies = (movieId, movieName, movieDate) => {
    navigate(`/bookings/${movieId}/${movieName}/${movieDate}`);
  }

  if (isLoading) {
    return (
      <Container fluid className="movies-section py-5 d-flex flex-column align-items-center justify-content-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3 text-center">Loading movies...</p>
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
  return (
    <Container fluid className="movies-section py-4 position-relative">
      {/* Search and Filter Section */}
      
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={4} lg={3} className="mb-3">
                <InputGroup>
                    <InputGroup.Text className="bg-dark text-success border-success">
                    <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search movies by name or location..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </InputGroup>
            </Col>
        <Col xs={12} md={4} lg={3} className="mb-3">
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
            <Col key={movie.id} xs={12} className="mb-3">
              <Card className="movie-card">
                <Card.Body className="p-0">
                  <Row className="g-0 align-items-center">
                    {/* Image Column */}
                    <Col xs={12} md="auto">
                      <div className="movie-poster-container">
                        <img
                          src={`/uploads/${movie.image}`}
                          alt={movie.name}
                          className="movie-poster"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/550x250/1a1a1a/00ffaa?text=No+Image';
                          }}
                        />
                      </div>
                    </Col>
                    
                    {/* Content Column */}
                    <Col className="d-flex flex-column p-1">
                      <div className="movie-info-section h-100">
                        {/* Movie Details */}
                        <div className="movie-details">
                          <h3 className="movie-title mb-2">{movie.name || 'Untitled Movie'}</h3>
                          
                          {/* Meta Information Row */}
                          <div className="movie-meta-row">
                            <span className="movie-genre">{movie.genre || 'Genre not specified'}</span>
                            <span className="movie-rating">⭐ {movie.ratings || 'N/A'}/10</span>
                          </div>
                          
                          {/* Additional Meta Information */}
                          <div className="movie-meta-row">
                            <span className="movie-meta movie-meta-certificate">{movie.certificate.toUpperCase() || 'Not Rated'}</span>
                            <span className="movie-meta movie-meta-runntime">{movie.runtime || 'Runtime N/A'} min</span>
                            <span className="movie-meta movie-meta-releasedate">
                              {movie.releasedate ? new Date(movie.releasedate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Date N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Section */}
                        <div className="movie-action-section mt-3">
                          <Button variant="primary" className="book-now-btn" onClick={() => handleBookingsFromMovies(movie.id, movie.name, movie.releasedate)}>
                            Book Now
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
            <div className="no-movies-container">
              <h3 className="no-movies-text mb-3">No movies found</h3>
              <p className="text-muted">Try adjusting your search criteria or filters</p>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default Movies;