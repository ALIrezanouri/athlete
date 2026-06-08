// Reports Page - Admin Only
'use client';

import { useState, useEffect } from 'react';
import {
  getUserGrowthReport,
  getBookingTrendsReport,
  getRevenueReport,
} from '@/app/actions/reports';
import type {
  UserGrowthReport,
  BookingTrendsReport,
  RevenueReport,
} from '@/app/actions/reports';

export default function ReportsPage() {
  const [userGrowth, setUserGrowth] = useState<UserGrowthReport | null>(null);
  const [bookingTrends, setBookingTrends] = useState<BookingTrendsReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userGrowthResult, bookingTrendsResult, revenueResult] = await Promise.all([
        getUserGrowthReport(startDate || undefined, endDate || undefined),
        getBookingTrendsReport(startDate || undefined, endDate || undefined),
        getRevenueReport(startDate || undefined, endDate || undefined),
      ]);

      if (userGrowthResult.success && userGrowthResult.data) {
        setUserGrowth(userGrowthResult.data);
      } else {
        setError(userGrowthResult.error || 'خطا در دریافت اطلاعات');
      }

      if (bookingTrendsResult.success && bookingTrendsResult.data) {
        setBookingTrends(bookingTrendsResult.data);
      } else {
        setError(bookingTrendsResult.error || 'خطا در دریافت اطلاعات');
      }

      if (revenueResult.success && revenueResult.data) {
        setRevenue(revenueResult.data);
      } else {
        setError(revenueResult.error || 'خطا در دریافت اطلاعات');
      }
    } catch (err) {
      setError('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApplyFilter = () => {
    fetchReports();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchReports();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const formatRevenue = (amount: number) => {
    return `${formatNumber(amount)} تومان`;
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      athlete: 'ورزشکار',
      gym_manager: 'مدیر سالن',
      coach: 'مربی',
      doctor: 'پزشک',
      admin: 'مدیر سیستم',
    };
    return roleLabels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      upcoming: 'در انتظار',
      active: 'فعال',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده',
      expired: 'منقضی شده',
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      upcoming: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading && !userGrowth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">گزارشات</h1>
          <p className="text-gray-600">نمای کلی از عملکرد سیستم</p>
        </div>

        {/* Date Filter */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">فیلتر بر اساس تاریخ</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                از تاریخ
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تا تاریخ
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilter}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                اعمال فیلتر
              </button>
              <button
                onClick={handleResetFilter}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                بازنشانی
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* User Growth Report */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">گزارش رشد کاربران</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل کاربران</h3>
              <p className="text-3xl font-bold text-gray-800">{userGrowth ? formatNumber(userGrowth.totalUsers) : '۰'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کاربران جدید این ماه</h3>
              <p className="text-3xl font-bold text-gray-800">{userGrowth ? formatNumber(userGrowth.newUsersThisMonth) : '۰'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کاربران جدید این هفته</h3>
              <p className="text-3xl font-bold text-gray-800">{userGrowth ? formatNumber(userGrowth.newUsersThisWeek) : '۰'}</p>
            </div>
          </div>

          {/* Users by Role Table */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">کاربران بر اساس نقش</h3>
            {userGrowth && userGrowth.usersByRole.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">نقش</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userGrowth.usersByRole.map((item) => (
                      <tr key={item.role} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-800">{getRoleLabel(item.role)}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">{formatNumber(item.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">داده‌ای موجود نیست</p>
            )}
          </div>
        </div>

        {/* Booking Trends Report */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">گزارش رزروها</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل رزروها</h3>
              <p className="text-3xl font-bold text-gray-800">{bookingTrends ? formatNumber(bookingTrends.totalBookings) : '۰'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">رزروهای این ماه</h3>
              <p className="text-3xl font-bold text-gray-800">{bookingTrends ? formatNumber(bookingTrends.bookingsThisMonth) : '۰'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">رزروهای این هفته</h3>
              <p className="text-3xl font-bold text-gray-800">{bookingTrends ? formatNumber(bookingTrends.bookingsThisWeek) : '۰'}</p>
            </div>
          </div>

          {/* Bookings by Status Table */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">رزروها بر اساس وضعیت</h3>
            {bookingTrends && bookingTrends.bookingsByStatus.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">وضعیت</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingTrends.bookingsByStatus.map((item) => (
                      <tr key={item.status} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-800">{formatNumber(item.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">داده‌ای موجود نیست</p>
            )}
          </div>

          {/* Top 5 Gyms by Booking Count */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">۵ باشگاه برتر بر اساس تعداد رزرو</h3>
            {bookingTrends && bookingTrends.topGymsByBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">باشگاه</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">تعداد رزرو</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingTrends.topGymsByBookings.map((item) => (
                      <tr key={item.gymId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-800">{item.gymName}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">{formatNumber(item.bookingCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">داده‌ای موجود نیست</p>
            )}
          </div>
        </div>

        {/* Revenue Report */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">گزارش درآمد</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل درآمد</h3>
              <p className="text-3xl font-bold text-gray-800">{revenue ? formatRevenue(revenue.totalRevenue) : '۰ تومان'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">درآمد این ماه</h3>
              <p className="text-3xl font-bold text-gray-800">{revenue ? formatRevenue(revenue.revenueThisMonth) : '۰ تومان'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">درآمد این هفته</h3>
              <p className="text-3xl font-bold text-gray-800">{revenue ? formatRevenue(revenue.revenueThisWeek) : '۰ تومان'}</p>
            </div>

            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">میانگین ارزش رزرو</h3>
              <p className="text-3xl font-bold text-gray-800">{revenue ? formatRevenue(revenue.averageBookingValue) : '۰ تومان'}</p>
            </div>
          </div>

          {/* Revenue by Gym Table */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">درآمد بر اساس باشگاه</h3>
            {revenue && revenue.revenueByGym.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">باشگاه</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">تعداد رزرو</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.revenueByGym.map((item) => (
                      <tr key={item.gymId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-800">{item.gymName}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">{formatNumber(item.bookingCount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">{formatRevenue(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">داده‌ای موجود نیست</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}