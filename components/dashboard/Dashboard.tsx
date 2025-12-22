import React from 'react';
import { StatCard } from './StatCard';
import RevenueChart from './RevenueChart';
import UpcomingArrivals from './UpcomingArrivals';
import ActivityLog from './ActivityLog';
import AvailabilityForecast from './AvailabilityForecast';
import { CreditCard, BedDouble, Users } from 'lucide-react';
import { Booking, Room, AuditLog, RoomStatus } from '../../types';

interface DashboardProps {
  stats: any;
  revenueChartData: any[];
  upcomingArrivals: Booking[];
  rooms: Room[];
  logs: AuditLog[];
  availabilityForecast: { date: Date; availableRooms: any[] }[];
  forecastPage: number;
  setForecastPage: (page: number | ((prev: number) => number)) => void;
  handleDashboardFilter: (filter: any) => void;
  handleEditBooking: (booking: Booking) => void;
  handleOpenNewBooking: (date: Date) => void;
  today: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  stats,
  revenueChartData,
  upcomingArrivals,
  rooms,
  logs,
  availabilityForecast,
  forecastPage,
  setForecastPage,
  handleDashboardFilter,
  handleEditBooking,
  handleOpenNewBooking,
  today,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Revenue Breakdown"
          value={`₹${stats.revenueToday.toLocaleString()}`}
          total={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<CreditCard size={20}/>}
          onClick={() => handleDashboardFilter({ type: 'pending', label: 'Pending Payments' })}
          details={[
            { label: 'Week', value: `₹${stats.revenueWeek.toLocaleString()}` },
            { label: 'Month', value: `₹${stats.revenueMonth.toLocaleString()}` },
            { label: 'Year', value: `₹${stats.revenueYear.toLocaleString()}` },
          ]}
        />
        <StatCard
          title="Occupancy"
          value={`${stats.occupancyToday}%`}
          total={`${stats.occupancyAllTime}%`}
          icon={<BedDouble size={20}/>}
          onClick={() => handleDashboardFilter({ status: RoomStatus.OCCUPIED, label: 'Occupied Rooms' })}
          details={[
            { label: 'Week', value: `${stats.occupancyWeek}%` },
            { label: 'Month', value: `${stats.occupancyMonth}%` },
            { label: 'Year', value: `${stats.occupancyYear}%` },
          ]}
        />
        <StatCard
          title="Check-ins"
          value={stats.checkInsToday}
          total={stats.totalCheckIns}
          icon={<Users size={20}/>}
          onClick={() => handleDashboardFilter({ type: 'checkin', date: today, label: "Today's Check-ins" })}
          details={[
            { label: 'Week', value: stats.checkInsWeek },
            { label: 'Month', value: stats.checkInsMonth },
            { label: 'Year', value: stats.checkInsYear },
          ]}
        />
      </div>

      <UpcomingArrivals
        arrivals={upcomingArrivals}
        rooms={rooms}
        onEditBooking={handleEditBooking}
        today={today}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart data={revenueChartData} />
        <ActivityLog logs={logs} />
      </div>

      <AvailabilityForecast
        forecast={availabilityForecast}
        forecastPage={forecastPage}
        setForecastPage={setForecastPage}
        onOpenNewBooking={handleOpenNewBooking}
      />
    </div>
  );
};

export default Dashboard;
