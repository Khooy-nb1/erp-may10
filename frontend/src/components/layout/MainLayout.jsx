import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col antialiased selection:bg-[#0F5FAF] selection:text-white">
      {/* Unified Global Header: Sticky top-0 across ALL pages */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Body Area */}
      {isHomePage ? (
        /* Homepage: Full width, extends under top navigation to showcase full May 10 Hero */
        <main className="flex-1 w-full relative">
          <Outlet />
        </main>
      ) : (
        /* Module Pages: Module Sidebar + Content Area */
        <div className="flex-1 flex w-full relative">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <Breadcrumb />
              <Outlet />
            </main>
          </div>
        </div>
      )}

      {/* Corporate Footer: Indented on module pages to align with content */}
      <div className={!isHomePage ? 'lg:pl-64' : ''}>
        <Footer />
      </div>
    </div>
  );
}
