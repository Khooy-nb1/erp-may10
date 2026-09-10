import React from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardNavSidebar from '../components/dashboard/DashboardNavSidebar';
import KPISection from '../components/dashboard/KPISection';
import ActionRequired from '../components/dashboard/ActionRequired';
import Workflow from '../components/dashboard/Workflow';
import ModuleCards from '../components/dashboard/ModuleCards';
import ActivityChart from '../components/dashboard/ActivityChart';
import RecentActivity from '../components/dashboard/RecentActivity';

export default function Dashboard() {
  return (
    <div className="w-full">
      {/* A. Panoramic May 10 Hero Header */}
      <DashboardHeader />

      {/* B. Main Two-Column Layout overlapping hero bottom edge */}
      <div className="w-full max-w-[1540px] mx-auto px-3 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20 pb-16">
        <div className="flex flex-col lg:flex-row items-start gap-5">
          {/* Left Column: Quick Navigation Sidebar */}
          <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
            <DashboardNavSidebar />
          </aside>

          {/* Right Column: KPIs, Action Required, Workflow, Modules & Activities */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* 1. 6 Business KPI Cards */}
            <KPISection />

            {/* 2. Action Required (3 items grid) */}
            <ActionRequired />

            {/* 3. Business Workflow */}
            <Workflow />

            {/* 4. 5 Core ERP Modules */}
            <ModuleCards />

            {/* 5. Operations Chart */}
            <ActivityChart />

            {/* 6. Recent Activity */}
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
