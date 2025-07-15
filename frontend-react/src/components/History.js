import React, { useEffect, useState } from "react";
import { Spinner, Button, Badge, Toast, ToastContainer } from "react-bootstrap";
import { useAuth } from "./Auth";
import { 
  FaTimes, 
  FaCalendarAlt, 
  FaClock, 
  FaMoneyBillWave, 
  FaChair,
  FaMapMarkerAlt
} from "react-icons/fa";
import "./History.css";

function History({ setShowHistory }) {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [tokenValid, setTokenValid] = useState(true);
  
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

  useEffect(() => {
    const valid = isTokenValid(refreshToken);
    setTokenValid(valid);
    if (!valid) {
      setToastMessage("Login required - Please sign in again");
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowHistory(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    let isMounted = true;

    const fetchBookings = async (tokenToUse = accessToken) => {
      try {
        const res = await fetch("http://localhost:5000/user/history", {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        });

        const data = await res.json();
        
        if (!res.ok) {
          if (data.error === "Access token expired") {
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
            if (isMounted) await fetchBookings(refreshData.access_token);
            return;
          } else {
            throw new Error(data.error || "Fetch failed");
          }
        }

        const groupedBookings = data.reduce((acc, booking) => {
          if (!acc[booking.booking_id]) {
            acc[booking.booking_id] = {
              ...booking,
              seats: [booking.seat_id],
            };
          } else {
            acc[booking.booking_id].seats.push(booking.seat_id);
          }
          return acc;
        }, {});
        const sortedBookings = Object.values(groupedBookings).sort((a, b) => {
          return b.booking_id - a.booking_id; 
        });
        if (isMounted) setBookings(Object.values(sortedBookings));
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBookings();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken, setAccessToken]);

  useEffect(() => {
      const valid = isTokenValid(refreshToken);
      setTokenValid(valid);
      
      if (!valid) {
        setToastMessage("Login required - Please sign in again");
        setShowToast(true);
        const timer = setTimeout(() => {
          setShowHistory(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
  }, [accessToken, setShowHistory]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5);
  };

  const handleCancelBooking = async (bookingId) => {
    let isMounted = true;
    setConfirmCancelId(null);
    const handleCancel = async (tokenToUse = accessToken) => {
      try {
        const res = await fetch(`http://localhost:5000/user/cancel_bookings?booking_id=${bookingId}`, {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        });

        const data = await res.json();
        
        if (!res.ok) {
          if (data.error === "Access token expired") {
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
            if (isMounted) await handleCancel(refreshData.access_token);
            return;
          } else {
            throw new Error(data.error || "Fetch failed");
          }
        } else {
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.booking_id === bookingId 
                ? { ...booking, status: 'cancelled' } 
                : booking
            )
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    handleCancel();
  };
  if (!tokenValid) {
    return (
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={3000} 
          autohide
          bg="danger"
        >
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    );
  }

  return (
    <div className="history-overlay">
      <div className="history-container">
        <div className="history-header">
          <h2>Booking History</h2>
          <button className="history-close-btn" onClick={() => setShowHistory(false)}>
            <FaTimes /> 
          </button>
        </div>

        <div className="history-content">
          {loading && (
            <div className="loading-container">
              <Spinner animation="border" variant="success" />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {bookings.length > 0 ? (
            <div className="bookings-list">
              {bookings.map((booking) => {
                const isPastShow = booking.show_date < new Date().toISOString().split('T')[0];
                const isActiveBooking = booking.status === 'booked' && !isPastShow;
                const isCancelled = booking.status === 'cancelled';
                const isExpired = booking.status === 'booked' && isPastShow;

                return (
                  <div key={booking.booking_id} className="booking-item">
                    <div className="booking-header">
                      <div className="booking-info">
                        <h3 className="movie-name">{booking.movie_name.toUpperCase()}</h3>
                        <div className="theater-info">
                          <FaMapMarkerAlt className="icon" />
                          <span>{booking.theater_name.toUpperCase() || 'Theater Name'} - SCREEN { booking.screen_id } </span>
                        </div>
                      </div>
                      <Badge 
                        bg={booking.status === 'booked' ? 'success' : 'danger'} 
                        className="status-badge"
                      >
                        {booking.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="booking-details">
                      <div className="detail-item">
                        <FaCalendarAlt className="icon" />
                        <span>{formatDate(booking.show_date)}</span>
                      </div>
                      <div className="detail-item">
                        <FaClock className="icon" />
                        <span>{formatTime(booking.show_time)}</span>
                      </div>
                      <div className="detail-item">
                        <FaChair className="icon" />
                        <span>Seats: {booking.seats.join(', ')}</span>
                      </div>
                      <div className="detail-item">
                        <FaMoneyBillWave className="icon" />
                        <span>Total: ₹{booking.total_price}</span>
                      </div>
                      <div className="detail-item">
                        <FaCalendarAlt className="icon" />
                        <span>Booked On: {booking.book_date}</span>
                      </div>
                    </div>
                    
                    {isActiveBooking && (
                      <div className="booking-actions">
                        {confirmCancelId === booking.booking_id ? (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleCancelBooking(booking.booking_id)}
                          >
                            Confirm Cancel
                          </Button>
                        ) : (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => setConfirmCancelId(booking.booking_id)}
                          >
                            Cancel Booking
                          </Button>
                        )}
                      </div>
                    )}

                    {isCancelled && (
                      <div className="booking-actions">
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          disabled
                          style={{ color: 'white', backgroundColor: 'rgba(220, 53, 69)', borderColor: 'rgba(220, 53, 69, 0.3)' }}
                        >
                          Cancelled
                        </Button>
                      </div>
                    )}
                    
                    {isExpired && (
                      <div className="booking-actions">
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          disabled
                          style={{ color: 'white', backgroundColor: 'rgba(220, 53, 69)', borderColor: 'rgba(220, 53, 69, 0.3)' }}
                        >
                          Expired
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !loading && !error && (
            <div className="no-bookings">
              <p>No bookings found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;