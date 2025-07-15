import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate} from 'react-router-dom';
import Theaters from "./book/Theaters";
import CustomNavbar from "./book/CustomNavbar";
import SocialSidebar from "./Sidebar"; 
import Footer from "./Footer"; 
import Login from "./Login";
import Register from "./Register";
import Profile from "./Profile"; 
import History from "./History";
import Contact from "./Contact";

const Bookings = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loginOutButton, setLoginOutButton] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [theaterId, setTheaterId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [screenId, setScreenId] = useState(null);
  const [showDate, setShowDate] = useState(null);
  const [showTime, setShowTime] = useState(null);
  const [theaterName, setTheaterName] = useState(null);
  const [theaterLocation, setTheaterLocation] = useState(null);

  const stableSetShowProfile = useCallback((val) => {
    setShowProfile(val);
  }, []);

  const profileMemo = useMemo(() => (
    <Profile setShowProfile={stableSetShowProfile} />
  ), [stableSetShowProfile]);

  const { movieId, movieName, movieDate } = useParams();
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
      {showHistory && (
        <History 
            setShowHistory={setShowHistory}
        />
      )}
      {showProfile && profileMemo}
      {showContact && <Contact setShowContact={setShowContact} />}
      <div style={{ textAlign: "center" }}>
          {<Theaters movieId={movieId} movieName={movieName} movieDate={movieDate} setTheaterId={setTheaterId} setScreenId={setScreenId} setShowDate={setShowDate} setShowTime={setShowTime} setTheaterName={setTheaterName} setTheaterLocation={setTheaterLocation} onAllSelected={handleMovieSelected}/>}
      </div>
      <Footer />
    </>
  );
};

export default Bookings; 
