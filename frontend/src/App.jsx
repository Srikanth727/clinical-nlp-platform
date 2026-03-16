import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import Navbar from './components/Navbar'
import Login from './components/Login/Login'
import Signup from './components/Signup/Signup'
import Dashboard from './components/Dashboard/Dashboard'
import ResultScreen from './components/Results/ResultScreen'

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Navbar />
        <div style={{ minHeight: 'calc(100vh - 60px)' }}>
          <Routes>
            <Route path='/' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/results/:uuid' element={<ResultScreen />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  )
}

export default App
