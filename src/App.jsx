import { Route, Routes } from 'react-router'
import Header from './components/Header'
import TStripe from './components/TStripe'
import Home from './pages/Home'
import Messages from './pages/Messages'
import Profile from './pages/Profile'

export default function App() {
  return (
    <>
      <TStripe />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  )
}