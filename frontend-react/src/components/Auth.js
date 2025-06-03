import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage if available
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('accessToken') || '';
  });
  
  const [refreshToken, setRefreshToken] = useState(() => {
    return localStorage.getItem('refreshToken') || '';
  });

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken); 
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);
  const logout = () => {
    // if (isTokenValid(refreshToken)){ 
      setAccessToken('');
      setRefreshToken('');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.reload(); 
    // }
  };

  return (
    <AuthContext.Provider value={{
      accessToken,
      refreshToken,
      setAccessToken,
      setRefreshToken,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);