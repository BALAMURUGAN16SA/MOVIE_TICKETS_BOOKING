import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import Movies from "./book/Movies";
import CustomNavbar from "./book/CustomNavbar";
import SocialSidebar from "./Sidebar"; 
import Login from "./Login";
import Register from "./Register";
import Footer from "./Footer";
import Profile from "./Profile"; 
import History from "./History";
import Contact from "./Contact";

const Lookings = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loginOutButton, setLoginOutButton] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [movieId, setMovieId] = useState(null);
  const [screenId, setScreenId] = useState(null);
  const [showDate, setShowDate] = useState(null);
  const [showTime, setShowTime] = useState(null);
  const [movieName, setMovieName] = useState(null);

  const stableSetShowProfile = useCallback((val) => {
    setShowProfile(val);
  }, []);

  const profileMemo = useMemo(() => (
    <Profile setShowProfile={stableSetShowProfile} />
  ), [stableSetShowProfile]);

  const { theaterId, theaterName, theaterLocation } = useParams();

  const navigate = useNavigate();

  const handleMovieSelected = () => {
    if (theaterId && movieId && screenId && showDate && showTime) {
      navigate('/seats', {
        state: { theaterId, movieId, screenId, showDate, showTime, theaterName, theaterLocation, movieName }
      });
    }
  };
  return (
    <>
        <CustomNavbar
          setShowProfile={stableSetShowProfile}
          setShowLogin={setShowLogin} // ← ADDED THIS PROP
          loginOutButton={loginOutButton}
          setLoginOutButton={setLoginOutButton}
          setShowHistory={setShowHistory}
          setShowContact={setShowContact}
        />

        <SocialSidebar />
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

        <div style={{ textAlign: "center" }}>
          {<Movies theaterId={theaterId} setMovieId={setMovieId} setScreenId={setScreenId} setShowDate={setShowDate} setShowTime={setShowTime} theaterName={theaterName} theaterLocation={theaterLocation} setMovieName={setMovieName} onAllSelected={handleMovieSelected}/>}
        </div>
        {showHistory && (
          <History 
              setShowHistory={setShowHistory}
          />
        )}
        {showProfile && profileMemo}
        {showContact && <Contact setShowContact={setShowContact} />}
        <Footer />
    </>
  );
}; 

export default Lookings;
