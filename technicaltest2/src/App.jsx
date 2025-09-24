import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Lading'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Navbar from './Componets/Navbar'
import './Styles/App.css'
import './Styles/Nav.css'

function App() {


  return (
    <>
   {/* Routes */}
    <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
    </>
  )
}

export default App
