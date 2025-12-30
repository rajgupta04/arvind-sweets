// Public Layout - Wraps public routes with Navbar and Footer
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from './ui/toaster';
import MobilePillNav from './MobilePillNav';
import CouponLoginPopup from './CouponLoginPopup';

function PublicLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/' || pathname === '/home';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pb-24 md:pb-0">
        <Outlet />
      </main>
      {isHome ? <Footer /> : <div className="hidden md:block"><Footer /></div>}
      <MobilePillNav />
      <Toaster />
      <CouponLoginPopup />
    </div>
  );
}

export default PublicLayout;
