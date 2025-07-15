import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ButtonGroup, ToggleButton } from 'react-bootstrap';
import CustomNavbar from './components/CustomNavbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import History from './components/History';
import Contact from './components/Contact';
import Movies from './components/Movies';
import Theaters from './components/Theaters';
import './MainPage.css';
function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [loginOutButton, setLoginOutButton] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState('movies');
  const [showContact, setShowContact] = useState(false);
  const moviesSectionRef = useRef(null);
    const handleMovieClick = () => {
      setViewMode('movies');
      setTimeout(() => {
        moviesSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 50); // Tiny delay to ensure render
  };
  const theatersSectionRef = useRef(null);
    const handleTheatersClick = () => {
      setViewMode('theaters');
      setTimeout(() => {
        theatersSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 50); // Tiny delay to ensure render
    };
  // Stable version of setShowProfile
  const stableSetShowProfile = useCallback((val) => {
    setShowProfile(val);
  }, []);

  // Memoized Profile component to prevent unnecessary re-mounts
  const profileMemo = useMemo(() => (
    <Profile setShowProfile={stableSetShowProfile} />
  ), [stableSetShowProfile]);

  return (
    <>
      <CustomNavbar
        setShowProfile={stableSetShowProfile}  // Use the stable version
        setShowLogin={setShowLogin}
        loginOutButton={loginOutButton}
        setLoginOutButton={setLoginOutButton}
        onMoviesClick={handleMovieClick}
        onTheatersClick={handleTheatersClick}
        setShowHistory={setShowHistory}
        setShowContact={setShowContact}
      />

      <Sidebar />
      <HeroSection setShowLogin={setShowLogin}/>

      {/* Styled Toggle Button Group */} 
      <div className="view-toggle-wrapper">  {/* New wrapper div */}
        <div className="view-toggle-container">
          <ButtonGroup className="view-toggle-group">
            <ToggleButton
              id="toggle-movies"
              type="radio"
              variant="link"
              name="viewMode"
              value="movies"
              checked={viewMode === 'movies'}
              onChange={(e) => setViewMode(e.currentTarget.value)}
              className={`view-toggle-btn ${viewMode === 'movies' ? 'active' : ''}`}
            >
              Movies
            </ToggleButton>
            <ToggleButton
              id="toggle-theaters"
              type="radio"
              variant="link"
              name="viewMode"
              value="theaters"
              checked={viewMode === 'theaters'}  
              onChange={(e) => setViewMode(e.currentTarget.value)}
              className={`view-toggle-btn ${viewMode === 'theaters' ? 'active' : ''}`}
            >
              Theaters
            </ToggleButton>
          </ButtonGroup>
        </div>
      </div>
      
      {viewMode === 'movies' ? (
          <div ref={moviesSectionRef}>
            <Movies />
          </div>
        ) : (
          <div ref={theatersSectionRef}>
            <Theaters />
          </div>
        )}

      {showContact && <Contact setShowContact={setShowContact} />}
      <Footer />

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

      {showProfile && profileMemo} 

      {showHistory && (
        <History 
            setShowHistory={setShowHistory}
        />
      )}
    </>
  );
}

export default App;