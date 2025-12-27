import React from 'react';
import { StatCard } from './StatCard';
import RevenueChart from './RevenueChart';
import UpcomingArrivals from './UpcomingArrivals';
import ActivityLog from './ActivityLog';
import AvailabilityForecast from './AvailabilityForecast';
import { PaymentQRCard } from './PaymentQRCard';
import UrgentArrivals from './UrgentArrivals';
import UrgentDepartures from './UrgentDepartures';
import { CreditCard, BedDouble, Users } from 'lucide-react';
import { Booking, Room, AuditLog, BookingStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';


interface DashboardProps {
  stats: any;
  revenueChartData: { last7Days: any[]; last30Days: any[]; last1Year: any[] };
  upcomingArrivals: Booking[];
  upcomingDepartures: Booking[];
  bookings: Booking[];
  rooms: Room[];
  logs: AuditLog[];
  availabilityForecast: { date: Date; availableRooms: any[] }[];
  forecastPage: number;
  setForecastPage: (page: number | ((prev: number) => number)) => void;
  handleDashboardFilter: (filter: any) => void;
  handleEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
  handleOpenNewBooking: (date: Date) => void;
  handleOpenDayDetails: (date: Date) => void;
  today: string;
  isRevenueVisible: boolean;
  setIsRevenueVisible: (visible: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  stats,
  revenueChartData,
  upcomingArrivals,
  upcomingDepartures,
  bookings,
  rooms,
  logs,
  availabilityForecast,
  forecastPage,
  setForecastPage,
  handleDashboardFilter,
  handleEditBooking,
  handleOpenNewBooking,
  handleOpenDayDetails,
  today,
  isRevenueVisible,
  setIsRevenueVisible,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <UrgentArrivals
        arrivals={upcomingArrivals}
        rooms={rooms}
        today={today}
        onEditBooking={handleEditBooking}
      />
      <UrgentDepartures
        departures={upcomingDepartures}
        rooms={rooms}
        today={today}
        onEditBooking={handleEditBooking}
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title={t('totalRevenue')}
          value={`₹${stats.revenueToday.toLocaleString()}`}
          total={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<CreditCard size={20} />}
          onClick={() => handleDashboardFilter({ type: 'pending', label: 'Pending Payments' })}
          details={[
            { label: 'Week', value: `₹${stats.revenueWeek.toLocaleString()}` },
            { label: 'Month', value: `₹${stats.revenueMonth.toLocaleString()}` },
            { label: 'Year', value: `₹${stats.revenueYear.toLocaleString()}` },
          ]}
          isRevenueVisible={isRevenueVisible}
          setIsRevenueVisible={setIsRevenueVisible}
        />
        <StatCard
          title={t('occupancyRate')}
          value={`${stats.occupancyToday}%`}
          total={`${stats.occupancyAllTime}%`}
          icon={<BedDouble size={20} />}
          onClick={() => handleDashboardFilter({ status: BookingStatus.CHECKED_IN, label: 'Checked-in Bookings' })}
          details={[
            { label: 'Week', value: `${stats.occupancyWeek}%` },
            { label: 'Month', value: `${stats.occupancyMonth}%` },
            { label: 'Year', value: `${stats.occupancyYear}%` },
          ]}
        />
        <StatCard
          title={t('totalCheckIns')}
          value={stats.checkInsToday}
          total={stats.totalCheckIns}
          icon={<Users size={20} />}
          onClick={() => handleDashboardFilter({ type: 'checkin', date: today, label: "Today's Check-ins" })}
          details={[
            { label: 'Week', value: stats.checkInsWeek },
            { label: 'Month', value: stats.checkInsMonth },
            { label: 'Year', value: stats.checkInsYear },
          ]}
        />
        <div className="md:hidden">
          <PaymentQRCard />
        </div>
      </div>

      <UpcomingArrivals
        arrivals={upcomingArrivals}
        rooms={rooms}
        onEditBooking={handleEditBooking}
        today={today}
      />



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isRevenueVisible && (
          <div className="lg:col-span-2">
            <RevenueChart data={revenueChartData} />
          </div>
        )}
        <div className={!isRevenueVisible ? 'lg:col-span-3' : 'lg:col-span-1'}>
          <ActivityLog logs={logs} />
        </div>
      </div>

      <AvailabilityForecast
        forecast={availabilityForecast}
        forecastPage={forecastPage}
        setForecastPage={setForecastPage}
        onOpenNewBooking={handleOpenNewBooking}
        rooms={rooms}
        bookings={bookings}
        onEditBooking={handleEditBooking}
        handleOpenDayDetails={handleOpenDayDetails}
      />
    </div>
  );
};

export default Dashboard;
