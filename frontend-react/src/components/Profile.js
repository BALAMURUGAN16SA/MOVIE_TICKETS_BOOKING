import React, { useEffect, useState } from "react";
import { Spinner, Alert, Toast, ToastContainer } from "react-bootstrap";
import { useAuth } from "./Auth";
import { FaUser, FaIdCard, FaEnvelope, FaMapMarkerAlt, FaTimes } from "react-icons/fa";
import "./Profile.css";

function Profile({ setShowProfile }) {
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

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

  useEffect(() => {
    const valid = isTokenValid(refreshToken);
    setTokenValid(valid);
    
    if (!valid) {
      setToastMessage("Login required - Please sign in again");
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowProfile(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [accessToken, setShowProfile]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (tokenToUse = accessToken) => {
      try {
        const res = await fetch("http://localhost:5000/user/profile", {
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
            if (isMounted) await fetchProfile(refreshData.access_token);
            return;
          } else {
            throw new Error(data.error || "Fetch failed");
          }
        }

        if (isMounted) setProfileData(data);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setToastMessage(err.message);
          setShowToast(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tokenValid && accessToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken, setAccessToken, tokenValid]);

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
    <div className="profile-overlay">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-card-body">
            <button 
              className="profile-close-btn" 
              onClick={() => setShowProfile(false)}
            >
              <FaTimes />
            </button>

            {loading && (
              <div className="profile-spinner-container">
                <Spinner animation="border" variant="success" />
              </div>
            )}

            {error && !showToast && (
              <Alert variant="danger" className="profile-alert">
                {error}
              </Alert>
            )}

            {profileData && (
              <div className="profile-content">
                <div className="profile-header">
                  <div className="profile-icon-container">
                    <FaUser className="profile-main-icon" />
                  </div>
                  <h2 className="profile-title">User Profile</h2>
                  <p className="profile-subtitle">Your account information</p>
                </div>

                <div className="profile-details">
                  <div className="profile-detail-item">
                    <div className="profile-detail-label">
                      <FaIdCard className="profile-detail-icon" />
                      <span>User ID</span>
                    </div>
                    <span className="profile-detail-value">{profileData.id}</span>
                  </div>
                  <div className="profile-detail-item">
                    <div className="profile-detail-label">
                      <FaEnvelope className="profile-detail-icon" />
                      <span>Email</span>
                    </div>
                    <span className="profile-detail-value">{profileData.email}</span>
                  </div>
                  <div className="profile-detail-item">
                    <div className="profile-detail-label">
                      <FaMapMarkerAlt className="profile-detail-icon" />
                      <span>Location</span>
                    </div>
                    <span className="profile-detail-value">
                      {profileData.location || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;