import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Row, Col, Toast, ToastContainer } from "react-bootstrap";
import { FaMapMarkerAlt, FaFilm, FaCalendarAlt, FaMoneyBillWave} from 'react-icons/fa';
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../Auth";
import './Seats.css';
import CustomNavbar from './CustomNavbar';
import Login from '../Login';
import Register from '../Register';
import Profile from "../Profile";
import History from '../History'; 
import Contact from "../Contact";
const Seats = () => {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const location = useLocation();
  const { theaterId, movieId, screenId, showDate, showTime, theaterName, theaterLocation, movieName } = location.state || {};
  const [seatsData, setSeatsData] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginOutButton, setLoginOutButton] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showContact, setShowContact] = useState(false);
  function isTokenValid(token) {
    if (!token) { return false; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (err) {
      console.error("Invalid token:", err);
      return false;
    }
  }
    const stableSetShowProfile = useCallback((val) => {
    setShowProfile(val);
  }, []);

  const profileMemo = useMemo(() => (
    <Profile setShowProfile={stableSetShowProfile} />
  ), [stableSetShowProfile]);
  useEffect(() => {
    let isMounted = true;
    
    const fetchSeats = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/user/screens?movie_id=${movieId}&theater_id=${theaterId}&screen_id=${screenId}&show_date=${showDate}&show_time=${showTime}`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch seats data");
        }

        const data = await res.json();
        return data;
      } catch (err) {
        console.error("Error fetching seats:", err);
        return null;
      }
    };

    (async () => {
      const data = await fetchSeats();
      if (isMounted && data) {
        setSeatsData(data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [ticketData]);

  const handleSeatSelection = (showId, seatId, seatNumber, seatType, isBooked, price) => {
  if (isBooked) return;
  
  const seatPrice = Number(price);
  
  setSelectedSeats(prev => {
    if (prev.some(s => s.seatId === seatId)) {
      return prev.filter(s => s.seatId !== seatId);
    } else {
      return [...prev, { showId, seatId, seatNumber, seatType, price: seatPrice }];
    }
  });

  setTotalPrice(prev => {
    const isAlreadySelected = selectedSeats.some(s => s.seatId === seatId);
    return isAlreadySelected ? prev - seatPrice : prev + seatPrice;
  });
};

  const groupSeatsByType = (seats) => {
    return seats.reduce((acc, seat) => {
      if (!acc[seat.seat_type]) acc[seat.seat_type] = [];
      acc[seat.seat_type].push(seat);
      return acc;
    }, {});
  };

  const renderSeatRows = (seats) => {
    const groupedSeats = groupSeatsByType(seats);
    
    return Object.entries(groupedSeats).map(([seatType, seatsOfType]) => {
      const seatPrice = seatsOfType[0]?.price;
      const seatLabel = seatType === 'elite' ? 'Elite' : 'Premium';

      const rows = [];
      
      for (let i = 0; i < seatsOfType.length; i += 10) {
        rows.push(seatsOfType.slice(i, i + 10));
      }

      return (
        <div key={seatType} className="seat-section">
          <div className="seat-type-header">
            <span className="seat-type-label">{seatLabel} Seats</span>
            <span className="seat-type-price">₹{seatPrice}</span>
          </div>
          <div className="seat-rows-container">
            {rows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="seat-row">
                {row.slice(0, 5).map(seat => (
                  <div
                    key={`left-${seat.seat_id}`}
                    className={`seat ${seat.is_booked ? 'booked' : ''} ${
                      selectedSeats.some(s => s.seatId === seat.seat_id) ? 'selected' : ''
                    }`}
                    onClick={() => handleSeatSelection(seat.show_id, seat.seat_id, seat.seat_number, seat.seat_type, seat.is_booked, Math.floor(Number(seat.price)) || 0)}
                  >
                    {seat.seat_number.replace(/^[EP]/, '')}
                  </div>
                ))}
                <div className="seat-gap"></div>
                {row.slice(5, 10).map(seat => (
                  <div
                    key={`right-${seat.seat_id}`}
                    className={`seat ${seat.is_booked ? 'booked' : ''} ${
                      selectedSeats.some(s => s.seatId === seat.seat_id) ? 'selected' : ''
                    }`}
                    onClick={() => handleSeatSelection(seat.show_id, seat.seat_id, seat.seat_number, seat.seat_type, seat.is_booked, Math.floor(Number(seat.price)) || 0)}
                  >
                    {seat.seat_number.replace(/^[EP]/, '')}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const handleBooking = async () => {
      let isMounted = true;
      if (!isTokenValid(refreshToken)) {
        setShowToast(true);
        return;
      }
      setBookingStatus(null);
      
      try {
        const fetchData = async (tokenToUse = accessToken, retryCount = 0) => {
          try {
            const res = await fetch('http://localhost:5000/user/book', {
              method: 'POST',
              headers: { 
                Authorization: `Bearer ${tokenToUse}`, 
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ 
                selected_seats: selectedSeats,
                movie_id: movieId,
                theater_id: theaterId,
                screen_id: screenId,
                show_date: showDate,
                show_time: showTime,
                total_price: totalPrice
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
              throw new Error(data.error || "Booking failed");
            }
            return data;
          } catch (err) {
            console.error("Booking API Error:", err);
            throw err;
          }
        };

        const bookingData = await fetchData(accessToken);
        
        if (!isMounted) return;
        
        if (!bookingData) {
          throw new Error("No booking data received");
        }
        setTicketData(bookingData);
        setBookingStatus('success');
        
      } catch (err) {
        if (!isMounted) return;
        
        console.error('Booking error:', err.message);
        // Only set error status if we're sure it's an actual error
        if (!err.message.includes("token") && !err.message.includes("refresh")) {
          setBookingStatus('error');
        }
      }
  };
  if (seatsData.length === 0) {
    return <div className="loading">Loading seat information...</div>;
  }

  return (
    <>
    <CustomNavbar
        setShowProfile={stableSetShowProfile}
        setShowLogin={setShowLogin}
        loginOutButton={loginOutButton}
        setLoginOutButton={setLoginOutButton}
        setShowHistory={setShowHistory}
        setShowContact={setShowContact}
      />
      {showLogin && (
        <Login 
          onClose={(loggedIn) => {
            setShowLogin(false);
            setLoginOutButton(loggedIn);
          }}
          onRegisterClick={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}
      
      {showRegister && (
        <Register 
          onClose={() => {
            setShowRegister(false); 
            setShowLogin(false);
          }} 
          onLoginClick={() => {
            setShowRegister(false);
            setShowLogin(true);
          }} 
        />
      )}
      {showHistory && (
        <History 
            setShowHistory={setShowHistory}
        />
      )}
      {showProfile && profileMemo}
      {showContact && <Contact setShowContact={setShowContact} />}
    <div className={`seats-container ${showPaymentModal ? 'blur-background' : ''}`}>
      <Row className="info-header mb-4">
        <Col md={6} className="movie-info"> 
        {/* classname is not theaterInfo.. somewhere in other css it is colliding with this, hence design varies.. hence movie info for both */}
          <div className="info-card">
            <h2 className="info-title">
              <FaFilm className="me-2" />
              {theaterName.toUpperCase()}
            </h2>
            <p className="info-subtitle">
              <FaMapMarkerAlt className="me-2" />
              {theaterLocation.toUpperCase()}
            </p>
          </div>
        </Col>
        <Col md={6} className="movie-info">
          <div className="info-card">
            <h2 className="info-title">
              <FaFilm className="me-2" />
              {movieName.toUpperCase()}
            </h2>
            <p className="info-subtitle">
              <FaCalendarAlt className="me-2" />
              {new Date(showDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="mx-2">•</span>
              {showTime}
            </p>
          </div>
        </Col>
      </Row>

      {/* Screen Visualization */}
      <div className="theater-screen">
        <div className="screen">{theaterId}</div>
         <h2 className="info-title" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
              <FaFilm className="me-2"/>
              SCREEN THIS SIDE
        </h2>
      </div>

      {/* Seats Layout */}
      <div className="seats-layout">
        {renderSeatRows(seatsData)}
      </div>

      {/* Booking Summary */}
      <div className="booking-summary">
        <div className="selected-seats">
          <h3>Selected Seats</h3>
          {selectedSeats.length > 0 ? (
            <div className="seat-list">
              {selectedSeats.map(seat => (
                <span key={seat.seatId} className="seat-badge">
                  {seat.seatNumber} ({seat.seatType})
                </span>
              ))}
            </div>
          ) : (
            <p>No seats selected</p>
          )}
        </div>
        <div className="total-price">
          <span>Total:</span>
          <span className="price">₹{totalPrice}</span>
        </div>
        <button 
          className="book-button" 
          disabled={selectedSeats.length === 0} 
          onClick={() => setShowPaymentModal(true)}
        >
          Book Now
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
            <ToastContainer 
              position="bottom-center"
              className="p-3"
              style={{ zIndex: 9999 }}
            >
              <Toast 
                show={showToast} 
                onClose={() => setShowToast(false)}
                delay={1000} 
                autohide
                bg="danger"
              >
                <Toast.Body className="text-white">Please login to book tickets</Toast.Body>
              </Toast>
            </ToastContainer>


          <div className="payment-modal">
            <button 
              className="close-modal-btn"
              onClick={() => {
                setShowPaymentModal(false);
                setBookingStatus(null);
                setSelectedSeats([]);
                setTotalPrice(0);
              }}
            >
              <FaTimes />
            </button>
            
            <div className="payment-header">
              <FaMoneyBillWave className="payment-icon" />
              <h2>Payment Summary</h2>
            </div>
            
            <div className="payment-details">
              <div className="payment-detail-item">
                <span className="detail-label">Movie:</span>
                <span className="detail-value">{movieName}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Theater:</span>
                <span className="detail-value">{theaterName.toUpperCase()}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Screen:</span>
                <span className="detail-value">{screenId}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Date & Time:</span>
                <span className="detail-value">
                  {new Date(showDate).toLocaleDateString('en-IN')} at {showTime}
                </span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Seats:</span>
                <div className="seats-selected">
                  {selectedSeats.map((seat, index) => (
                    <span key={index} className="seat-tag">
                      {seat.seatNumber} ({seat.seatType})
                    </span>
                  ))}
                </div>
              </div>
              <div className="payment-detail-item total">
                <span className="detail-label">Total Amount:</span>
                <span className="detail-value price">₹{totalPrice}</span>
              </div>
            </div>

            {!bookingStatus ? (
              <button 
                className="pay-now-btn"
                onClick={() => handleBooking()}
              >
                Confirm & Pay
              </button>
            ) : bookingStatus === 'success' ? (
              <div className="booking-success">
                <h3>Booking Successful!</h3>
                <p>Your ticket has been booked.</p>
                <div className="ticket-info">
                  <p>Booking ID: {ticketData?.booking_id}</p>
                </div>
                <button 
                  className="close-success-btn"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setBookingStatus(null);
                    setSelectedSeats([]);
                    setTotalPrice(0);
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="booking-error">
                <h3>Booking Failed</h3>
                <p>Some seats might have been already booked. Please try again.</p>
                <button 
                  className="close-error-btn"
                  onClick={() => setBookingStatus(null)}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Seats;