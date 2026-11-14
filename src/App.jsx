import { Route, Routes } from 'react-router'
import {
  RequireAuth,
  RequireLoggedOut,
  RequireOnboarded,
} from './components/Guards'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Admin from './pages/Admin'
import CreateEvent from './pages/CreateEvent'
import EventDetail from './pages/EventDetail'
import Explore from './pages/Explore'
import Friends from './pages/Friends'
import Home from './pages/Home'
import Login from './pages/Login'
import Messages from './pages/Messages'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import Styleguide from './pages/Styleguide'
import UserProfile from './pages/UserProfile'
import Welcome from './pages/Welcome'

// Every page on the site. Pages inside a layout route share its frame;
// pages inside a guard route only show when the guard allows it.
export default function App() {
  return (
    <Routes>
      {/* Logged-in people finish onboarding before anything else. */}
      <Route element={<RequireOnboarded />}>
        <Route element={<AppLayout />}>
          {/* Anyone can see these. */}
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="u/:username" element={<UserProfile />} />
          <Route path="styleguide" element={<Styleguide />} />

          {/* These need an account. */}
          <Route element={<RequireAuth />}>
            <Route path="events/new" element={<CreateEvent />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:conversationId" element={<Messages />} />
            <Route path="friends" element={<Friends />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="welcome" element={<Welcome />} />
        <Route element={<RequireLoggedOut />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="onboarding" element={<Onboarding />} />
        </Route>
      </Route>
    </Routes>
  )
}
