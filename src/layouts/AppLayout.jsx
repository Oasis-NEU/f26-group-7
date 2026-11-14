import { Outlet } from 'react-router'
import Header from '../components/Header'
import TStripe from '../components/TStripe'

// The frame around the main pages. <Outlet /> is where the page that
// matches the address goes.
export default function AppLayout() {
  return (
    <>
      <TStripe />
      <Header />
      <Outlet />
    </>
  )
}
