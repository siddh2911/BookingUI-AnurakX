import React from 'react';
import { StatCard } from './StatCard';
import RevenueChart from './RevenueChart';
import UpcomingArrivals from './UpcomingArrivals';
import AvailabilityForecast from './AvailabilityForecast';
import { PaymentQRCard } from './PaymentQRCard';
import UrgentArrivals from './UrgentArrivals';
import UrgentDepartures from './UrgentDepartures';
import OccupancyChart from './OccupancyChart';
import BookingStats from '../bookings/BookingStats';
import { CreditCard, BedDouble, Users } from 'lucide-react';
import { Booking, Room, AuditLog, BookingStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';


interface DashboardProps {
  stats: any;
  housekeepingTasks: any[];

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

  upcomingArrivals,
  upcomingDepartures,
  bookings,
  rooms,
  logs,
  housekeepingTasks,
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
        housekeepingTasks={housekeepingTasks}
      />
      <UrgentDepartures
        departures={upcomingDepartures}
        rooms={rooms}
        today={today}
        onEditBooking={handleEditBooking}
        housekeepingTasks={housekeepingTasks}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title={t('totalRevenue')}
          comparatorLabel="% change vs Normal Rental"
          value={`₹${stats.revenueToday.toLocaleString()}`}
          total={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<CreditCard size={20} />}
          onClick={() => handleDashboardFilter({ type: 'pending', label: 'Pending Payments' })}
          details={(() => {
            const roomCount = rooms?.length || 0;
            const dailyRate = 400;
            const monthlyRate = 12000;


            const targetWeekly = dailyRate * 7 * roomCount;
            const targetMonthly = monthlyRate * roomCount;
            const targetYearly = monthlyRate * 12 * roomCount;


            const calcTrend = (actual: number, target: number) => {
              if (target === 0) return undefined;
              return {
                value: Math.round(((actual - target) / target) * 100),
                positive: actual >= target
              };
            };


            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = now.getDate();

            const predictedYearlyRevenue = Math.round((stats.revenueMonth / Math.max(1, daysElapsed)) * 365);

            return [
              { label: 'Week', value: `₹${stats.revenueWeek.toLocaleString()}`, trend: calcTrend(stats.revenueWeek, targetWeekly) },
              { label: 'Month', value: `₹${stats.revenueMonth.toLocaleString()}`, trend: calcTrend(stats.revenueMonth, targetMonthly) },
              { label: 'Year', value: `₹${stats.revenueYear.toLocaleString()}`, trend: undefined },
              { label: 'Year (Proj.)', value: `₹${predictedYearlyRevenue.toLocaleString()}`, trend: calcTrend(predictedYearlyRevenue, targetYearly) },
            ];
          })()}
          isRevenueVisible={isRevenueVisible}
          setIsRevenueVisible={setIsRevenueVisible}
          hoverContent={<BookingStats bookings={bookings} mode="revenue" compact />}
          trend={undefined}
        />
        <StatCard
          title={t('occupancyRate')}
          comparatorLabel="vs 40% Min Monthly Occupancy"
          value={`${stats.occupancyToday}%`}
          total={`${stats.occupancyAllTime}%`}
          icon={<BedDouble size={20} />}
          onClick={() => handleDashboardFilter({ status: BookingStatus.CHECKED_IN, label: 'Checked-in Bookings' })}
          details={(() => {
            const target = 40;
            const calcTrend = (actual: number) => ({
              value: Math.round(actual - target),
              positive: actual >= target
            });


            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = now.getDate();
            const multiplier = daysInMonth / Math.max(1, daysElapsed);
            const projectedOccupancyYear = Math.min(100, Math.round(stats.occupancyMonth * multiplier));

            return [
              { label: 'Week', value: `${stats.occupancyWeek}%`, trend: undefined },
              { label: 'Month', value: `${stats.occupancyMonth}%`, trend: calcTrend(stats.occupancyMonth) },
              { label: 'Year', value: `${stats.occupancyYear}%`, trend: undefined },
              { label: 'Year (Proj.)', value: `${projectedOccupancyYear}%`, trend: calcTrend(projectedOccupancyYear) },
            ];
          })()}
          hoverContent={<BookingStats bookings={bookings} mode="percent" compact />}
          totalTrend={undefined}
          trend={undefined}
        />
        <StatCard
          title={t('totalCheckIns')}
          comparatorLabel="vs 2 Check-ins/Week Goal"
          value={stats.checkInsToday}
          total={stats.totalCheckIns}
          icon={<Users size={20} />}
          onClick={() => handleDashboardFilter({ type: 'checkin', date: today, label: "Today's Check-ins" })}
          details={(() => {

            const targetWeekly = 2;
            const targetDaily = targetWeekly / 7;


            const now = new Date();
            const daysInMonth = now.getDate();


            const currentMonthRate = stats.checkInsMonth / Math.max(1, daysInMonth);
            const projectedYearlyCheckIns = Math.round(currentMonthRate * 365);


            const targetAnnual = Math.round(targetDaily * 365);


            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const daysInYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const calcTrend = (actual: number, targetDays: number) => {
              const target = targetDaily * targetDays;
              if (target === 0) return undefined;
              return {
                value: Math.round(((actual - target) / target) * 100),
                positive: actual >= target
              };
            };


            const yearProjTrend = {
              value: Math.round(((projectedYearlyCheckIns - targetAnnual) / targetAnnual) * 100),
              positive: projectedYearlyCheckIns >= targetAnnual
            };

            return [
              { label: 'Week', value: stats.checkInsWeek, trend: calcTrend(stats.checkInsWeek, 7) },
              { label: 'Month', value: stats.checkInsMonth, trend: calcTrend(stats.checkInsMonth, 30) },
              { label: 'Year', value: stats.checkInsYear, trend: undefined },
              { label: 'Year (Proj.)', value: projectedYearlyCheckIns, trend: yearProjTrend },
            ];
          })()}
          hoverContent={<BookingStats bookings={bookings} mode="count" compact />}
          totalTrend={undefined}
          trend={undefined}
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
        housekeepingTasks={housekeepingTasks}
      />



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isRevenueVisible ? (
          <>
            <div className="h-[450px] lg:h-[400px]">
              <RevenueChart bookings={bookings} />
            </div>
            <div className="h-[450px] lg:h-[400px]">
              <OccupancyChart bookings={bookings} rooms={rooms} />
            </div>
          </>
        ) : (
          <div className="h-[450px] lg:h-[400px] lg:col-span-2">
            <OccupancyChart bookings={bookings} rooms={rooms} />
          </div>
        )}
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
        housekeepingTasks={housekeepingTasks}
      />
    </div>
  );
};

export default Dashboard;
