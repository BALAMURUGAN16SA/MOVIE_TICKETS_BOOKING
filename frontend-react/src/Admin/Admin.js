import React, { useState, useEffect } from 'react';
import AdminNavbar from './AdminNavbar';
import { useAuth } from '../components/Auth';
import { Container, Card, Table, Button, Spinner, Alert, Accordion } from 'react-bootstrap';
import './Admin.css';

const colorList = ['rgba(0, 200, 0)', 'rgba(200, 0, 0)', 'rgba(0, 0, 200)', 'rgba(255, 165, 0)', 'rgba(128, 0, 128, 1)', 'rgba(255, 250, 205, 1)', 'rgba(255, 0, 255, 1)', 'rgba(128, 128, 128, 1)'];
const theaterColorMap = new Map();

const getColor = (theaterId) => {
  if (!theaterColorMap.has(theaterId)) {
    const index = theaterColorMap.size % colorList.length;
    theaterColorMap.set(theaterId, colorList[index]);
  }
  return theaterColorMap.get(theaterId);
};

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

const Admin = () => {
  const { accessToken, refreshToken, setAccessToken, logout } = useAuth();
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
    <>
      <AdminNavbar />
      <Container className="mt-5 pt-4">
        <h1 className="text-center mb-4" style={{ color: '#00c900' }}>
          Welcome to Admin Dashboard
        </h1>
        
        <Accordion defaultActiveKey={['0', '1', '2', '3']} alwaysOpen>
          <MoviesAccordionItem />
          <TheatersAccordionItem />
          <ScreensAccordionItem />
          <ShowsAccordionItem />
        </Accordion>
      </Container>
    </>
  );
};

// Movies Component
const MoviesAccordionItem = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, refreshToken, setAccessToken } = useAuth();
  console.log(accessToken, refreshToken);
  const fetchWithAuth = async (url, options = {}, retryCount = 0) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(data);
    
    if (!response.ok) {
      if (data.error === "Access token expired" && retryCount < 1) {
        const refreshResponse = await fetch("http://localhost:5000/user/refresh", {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        });

        const refreshData = await refreshResponse.json();

        if (!refreshResponse.ok) {
          throw new Error(refreshData.error || "Failed to refresh token");
        }

        // Update the state for future requests
        setAccessToken(refreshData.access_token);
        
        // Use the fresh token directly in the retry - don't rely on state
        return await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.access_token}`, // Use fresh token here
            'Content-Type': 'application/json'
          }
        }).then(response => response.json());
      }
      throw new Error(data.error || "Request failed");
    }

    return data;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
};

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch('http://localhost:5000/admin/movies');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMovies(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [accessToken, setAccessToken]);

  const handleDelete = async (id) => {
    try {
      await fetchWithAuth(`http://localhost:5000/admin/delete_movies?mid=${id}`, {
        method: 'DELETE'
      });
      setMovies(movies.filter(movie => movie.id !== id));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting movie:', err);
    }
  };

  if (error) return <Alert variant="danger">Error: {error}</Alert>;

  return (
    <Accordion.Item eventKey="0" className="admin-accordion-item">
      <Accordion.Header className="accordion-header">
        <h2 className="mb-0">Movies</h2>
      </Accordion.Header>
      <Accordion.Body>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Director</th>
                  <th>Duration</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.map(movie => (
                  <tr key={movie.id}>
                    <td>{movie.id}</td>
                    <td>{movie.name.toUpperCase()}</td>
                    <td>{movie.genre.toUpperCase()}</td>
                    <td>{movie.runtime}</td>
                    <td>{movie.ratings}</td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        onClick={() => handleDelete(movie.id)}
                        className="delete-btn"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

// Theaters Component
const TheatersAccordionItem = () => {
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, refreshToken, setAccessToken } = useAuth();

  const fetchWithAuth = async (url, options = {}, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Access token expired" && retryCount < 1) {
          const refreshResponse = await fetch("http://localhost:5000/user/refresh", {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          const refreshData = await refreshResponse.json();

          if (!refreshResponse.ok) {
            throw new Error(refreshData.error || "Failed to refresh token");
          }

           setAccessToken(refreshData.access_token);
        
          // Use the fresh token directly in the retry - don't rely on state
          return await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${refreshData.access_token}`, // Use fresh token here
              'Content-Type': 'application/json'
            }
          }).then(response => response.json());
        }
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err) {
      console.error("API Error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        const response = await fetch('http://localhost:5000/admin/theaters');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTheaters(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching theaters:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTheaters();
  }, []);

  const handleDelete = async (id) => {
    try {
      await fetchWithAuth(`http://localhost:5000/admin/delete_theaters?tid=${id}`, {
        method: 'DELETE'
      });
      setTheaters(theaters.filter(theater => theater.id !== id));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting theater:', err);
    }
  };

  if (error) return <Alert variant="danger">Error: {error}</Alert>;

  return (
    <Accordion.Item eventKey="1" className="admin-accordion-item" style={{backgroundColor:'#000c07'}}>
      <Accordion.Header className="accordion-header">
        <h2 className="mb-0">Theaters</h2>
      </Accordion.Header>
      <Accordion.Body>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Parking</th>
                  <th>Accessibility</th>
                  <th>Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {theaters.map(theater => (
                  <tr key={theater.id}>
                    <td>{theater.id}</td>
                    <td>{theater.name.toUpperCase()}</td>
                    <td>{theater.location.toUpperCase()}</td>
                    <td>{theater.parking ? 'Yes' : 'No'}</td>
                    <td>{theater.accessibility ? 'Yes' : 'No'}</td>
                    <td>{theater.hours.toUpperCase()}</td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        onClick={() => handleDelete(theater.id)}
                        className="delete-btn"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

// Screens Component
const ScreensAccordionItem = () => {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, refreshToken, setAccessToken } = useAuth();

  const fetchWithAuth = async (url, options = {}, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Access token expired" && retryCount < 1) {
          const refreshResponse = await fetch("http://localhost:5000/user/refresh", {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          const refreshData = await refreshResponse.json();

          if (!refreshResponse.ok) {
            throw new Error(refreshData.error || "Failed to refresh token");
          }

           setAccessToken(refreshData.access_token);
        
        // Use the fresh token directly in the retry - don't rely on state
        return await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.access_token}`, // Use fresh token here
            'Content-Type': 'application/json'
          }
        }).then(response => response.json());
      }
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err) {
      console.error("API Error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const response = await fetch('http://localhost:5000/admin/screens');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setScreens(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching screens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScreens();
  }, []);

  const handleDelete = async (theaterId, screenId) => {
    try {
      await fetchWithAuth(`http://localhost:5000/admin/delete_screens?tid=${theaterId}&sid=${screenId}`, {
        method: 'DELETE'
      });
      setScreens(screens.filter(screen => 
        !(screen.theater_id === theaterId && screen.screen_id === screenId)
      ));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting screen:', err);
    }
  };

  if (error) return <Alert variant="danger">Error: {error}</Alert>;

  return (
    <Accordion.Item eventKey="2" className="admin-accordion-item">
      <Accordion.Header className="accordion-header">
        <h2 className="mb-0">Screens</h2>
      </Accordion.Header>
      <Accordion.Body>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="admin-table">
              <thead>
                <tr>
                  <th>Theater ID</th>
                  <th>Screen ID</th>
                  <th>Screen Name</th>
                  <th>Elite Seats</th>
                  <th>Premium Seats</th>
                  <th>Elite Price</th>
                  <th>Premium Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {screens.map(screen => (
                  <tr key={`${screen.theater_id}-${screen.screen_id}`}>
                    <td style={{ backgroundColor: getColor(screen.theater_id) }}>{screen.theater_id}</td>
                    <td>{screen.screen_id}</td>
                    <td>{screen.screen_name.toUpperCase()}</td>
                    <td>{screen.elite_seats}</td>
                    <td>{screen.premium_seats}</td>
                    <td>{screen.elite_price}</td>
                    <td>{screen.premium_price}</td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        onClick={() => handleDelete(screen.theater_id, screen.screen_id)}
                        className="delete-btn"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

// Shows Component
const ShowsAccordionItem = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, refreshToken, setAccessToken } = useAuth();

  const fetchWithAuth = async (url, options = {}, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Access token expired" && retryCount < 1) {
          const refreshResponse = await fetch("http://localhost:5000/user/refresh", {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          const refreshData = await refreshResponse.json();

          if (!refreshResponse.ok) {
            throw new Error(refreshData.error || "Failed to refresh token");
          }

          setAccessToken(refreshData.access_token);
        
          // Use the fresh token directly in the retry - don't rely on state
          return await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.access_token}`, // Use fresh token here
            'Content-Type': 'application/json'
          }
        }).then(response => response.json());
      }
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err) {
      console.error("API Error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const response = await fetch('http://localhost:5000/admin/shows');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setShows(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching shows:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, []);

  const handleDelete = async (showId) => {
    try {
      await fetchWithAuth(`http://localhost:5000/admin/delete_shows?sid=${showId}`, {
        method: 'DELETE'
      });
      setShows(shows.filter(show => show.show_id !== showId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting show:', err);
    }
  };

  if (error) return <Alert variant="danger">Error: {error}</Alert>;

  return (
    <Accordion.Item eventKey="3" className="admin-accordion-item">
      <Accordion.Header className="accordion-header">
        <h2 className="mb-0">Shows</h2>
      </Accordion.Header>
      <Accordion.Body>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="admin-table">
              <thead>
                <tr>
                  <th>Theater ID</th>
                  <th>Show ID</th>
                  <th>Movie ID</th>
                  <th>Screen ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shows.map(show => (
                  <tr key={show.show_id}>
                    <td style={{ backgroundColor: getColor(show.theater_id) }}>{show.theater_id}</td>
                    <td>{show.show_id}</td>
                    <td>{show.movie_id}</td>
                    <td>{show.screen_id}</td>
                    <td>{show.show_date}</td>
                    <td>{show.show_time}</td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        onClick={() => handleDelete(show.show_id)}
                        className="delete-btn"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Admin;