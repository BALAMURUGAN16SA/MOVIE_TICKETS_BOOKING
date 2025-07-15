import { Container, Row, Col, Button, Carousel, ToastContainer, Toast } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'react';
import { IoMdFilm, IoIosArrowDropleftCircle, IoIosArrowDroprightCircle } from 'react-icons/io';
import { useNavigate } from "react-router-dom";
import { useAuth } from './Auth';
import './HeroSection.css';

const HeroSection = ({setShowLogin}) => {
  const {refreshToken} = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const carouselRef = useRef(null);
  const navigate = useNavigate();

  function isTokenValid(token) {
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (err) {
      console.error("Invalid token:", err);
      return false;
    }
  }

  function handleStartNow(){
    var validity = isTokenValid(refreshToken);
    if (validity) {
      setShowToast(true);
      return;
    }
    else {
      setShowLogin(true);
      return;
    }
  }
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch("http://localhost:5000/");
        const data = await response.json();
        setMovies(data);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMovies();
  }, []);

  useEffect(() => {
    if (movies.length === 0) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % movies.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [movies.length]);

  const handlePrev = () => {
    setActiveIndex((prevIndex) => 
      prevIndex === 0 ? movies.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setActiveIndex((prevIndex) => 
      (prevIndex + 1) % movies.length
    );
  };

  const handleBookingsFromMovies = (movieId, movieName, movieDate) => {
    navigate(`/bookings/${movieId}/${movieName}/${movieDate}`);
  }

  return (
    <section className="hero-section">
      <Container>
        <Row className="align-items-center">
          {/* Left Column - Original Content */}
          <Col lg={6} className="hero-content">
            <h1 className="hero-title">
              <span className="text-gradient">Lights,</span>{' '}
              <span className="text-gradient">Camera</span>{' '}
              <span className="text-gradient">and Cinema</span>
            </h1>
            <h2 className="hero-subtitle">Theater Experience Reimagined</h2>
            <p className="hero-text">
              Book your tickets, now!
            </p>
            <div className="button-container">
              <Button className="hero-button px-4 py-2" onClick={()=>handleStartNow()}>
                Start Now
              </Button>
            </div>
            <div className="hero-image-container">
              <img 
                src={`/uploads/f.png`}
                alt="Modern theater experience" 
                className="hero-image"
              />
              <div className="image-overlay"></div>
            </div>
          </Col>

          
          <div className="torchlight">
            <div className="torch-flame"></div>
            <div className="torch-beam"></div>
          </div>


          {/* Right Column - Centered Vertical Carousel */}
          <Col lg={6} className="carousel-column">
            <div className="top-movies-label">
              TOP MOVIES RUNNING <IoMdFilm className="film-icon" />
            </div>

            <div className="film-reel-container">
              {/* Left film reel */}
              <div className="film-reel film-reel-left">
                {[...Array(10)].map((_, i) => (
                  <div key={`left-${i}`} className="film-perforation"></div>
                ))}
              </div>
                                          
              {/* Carousel */}
              <div className="compact-carousel-container">
                <Carousel 
                  ref={carouselRef}
                  activeIndex={activeIndex}
                  onSelect={setActiveIndex}
                  controls={false}
                  indicators={false}
                  interval={null}
                  direction="vertical"
                  className="compact-vertical-carousel"
                >
                  {movies.map((movie, index) => (
                    <Carousel.Item key={index} className="compact-movie-card">
                      <div className="compact-movie-content">
                        <img
                          className="compact-movie-image"
                          src={`/uploads/${movie.image}`}
                          alt={movie.name}
                        />
                        <div className="compact-movie-info">
                          <h3 className="compact-movie-title">{movie.title}</h3>
                          <div className="compact-movie-meta">
                            <span className="compact-movie-genre">{movie.genre}</span>
                            <span className="compact-movie-rating">⭐ {movie.ratings} / 10</span>
                          </div>
                          <p className="compact-movie-description">{movie.description}</p>
                          <div className="compact-movie-subinfo">
                            <span>{movie.certificate.toUpperCase()}</span>
                            <span>{movie.runtime} min</span>
                            <span>{movie.releasedate.slice(0, 10)}</span>
                          </div>
                          <div className="movie-actions">
                            <Button className="compact-book-button" onClick={() => handleBookingsFromMovies(movie.id, movie.name, movie.releasedate)}>
                              Book Now
                            </Button>
                            <div className="horizontal-carousel-controls">
                              <button 
                                className="carousel-control-btn prev-btn-horizontal"
                                onClick={handlePrev}
                                aria-label="Previous"
                              >
                                <IoIosArrowDropleftCircle />
                              </button>
                              <button 
                                className="carousel-control-btn next-btn-horizontal"
                                onClick={handleNext}
                                aria-label="Next"
                              >
                                <IoIosArrowDroprightCircle />
                              </button>
                            </div>
                          </div>
                      
                        </div>
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
              
              {/* Right film reel */}
              <div className="film-reel film-reel-right">
                {[...Array(10)].map((_, i) => (
                  <div key={`right-${i}`} className="film-perforation"></div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      <ToastContainer position="top-start" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
            show={showToast} 
            onClose={() => setShowToast(false)} 
            delay={5000} 
            autohide 
            bg={'success'}
        >
            <Toast.Body className="text-white">
              Logged in already! Enjoy your journey!
            </Toast.Body>
        </Toast>
      </ToastContainer>

    </section>

    
  );
};

export default HeroSection;