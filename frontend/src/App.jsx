import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root path displays the Welcome Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main application dashboard */}
        <Route path="/home" element={<Home />} />

        {/* Catch-all route redirects back to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;