import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './Admin/Admin';
import AddMovies from './Admin/AddMovies';
import AddTheaters from './Admin/AddTheaters';
import AddShows from './Admin/AddShows';
import Bookings from './components/Bookings';
import Lookings from './components/Lookings';
import MainPage from './MainPage';
import Seats from './components/book/Seats';
import { AuthProvider } from './components/Auth';
function App() {
  return (
    <div className="app-container">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/admin-dashboard" element={<Admin />} />
            <Route path="/admin-dashboard/add-movies" element={<AddMovies />} />
            <Route path="/admin-dashboard/add-theaters" element={<AddTheaters />} />
            <Route path="/admin-dashboard/add-shows" element={<AddShows />} />
            <Route path="/bookings/:movieId/:movieName/:movieDate" element={<Bookings />} />
            <Route path="/lookings/:theaterId/:theaterName/:theaterLocation" element={<Lookings />} />
            <Route path="/seats" element={<Seats />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
  </div>
  );
} 

export default App;
