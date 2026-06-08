// Analytics Page - Admin Only
'use client';

import { useState, useEffect } from 'react';
import { getAnalyticsMetrics, getUsersByRole } from '@/app/actions/analytics';
import type { AnalyticsMetrics, UsersByRole } from '@/app/actions/analytics';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [usersByRole, setUsersByRole] = useState<UsersByRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsResult, usersResult] = await Promise.all([
        getAnalyticsMetrics(startDate || undefined, endDate || undefined),
        getUsersByRole(),
      ]);

      if (metricsResult.success && metricsResult.data) {
        setMetrics(metricsResult.data);
      } else {
        setError(metricsResult.error || 'خطا در دریافت اطلاعات');
      }

      if (usersResult.success && usersResult.data) {
        setUsersByRole(usersResult.data);
      } else {
        setError(usersResult.error || 'خطا در دریافت اطلاعات');
      }
    } catch (err) {
      setError('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleApplyFilter = () => {
    fetchAnalytics();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchAnalytics();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const formatRevenue = (amount: number) => {
    return `${formatNumber(amount)} تومان`;
  };

  if (loading && !metrics) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">آمار و تحلیل</h1>
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

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">شاخص‌های کلیدی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل کاربران</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.totalUsers) : '۰'}</p>
            </div>

            {/* Total Gyms */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل باشگاه‌ها</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.totalGyms) : '۰'}</p>
            </div>

            {/* Total Bookings */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل رزروها</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.totalBookings) : '۰'}</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">کل درآمد</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatRevenue(metrics.totalRevenue) : '۰ تومان'}</p>
            </div>
          </div>
        </div>

        {/* Booking Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">وضعیت رزروها</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Bookings */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">رزروهای فعال</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.activeBookings) : '۰'}</p>
            </div>

            {/* Pending Bookings */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">رزروهای در انتظار</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.upcomingBookings) : '۰'}</p>
            </div>

            {/* Completed Bookings */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">رزروهای تکمیل شده</h3>
              <p className="text-3xl font-bold text-gray-800">{metrics ? formatNumber(metrics.completedBookings) : '۰'}</p>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">کاربران بر اساس نقش</h2>
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Athletes */}
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {usersByRole ? formatNumber(usersByRole.athletes) : '۰'}
                </div>
                <div className="text-sm font-medium text-gray-700">ورزشکاران</div>
              </div>

              {/* Managers */}
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {usersByRole ? formatNumber(usersByRole.gym_managers) : '۰'}
                </div>
                <div className="text-sm font-medium text-gray-700">مدیران</div>
              </div>

              {/* Coaches */}
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {usersByRole ? formatNumber(usersByRole.coaches) : '۰'}
                </div>
                <div className="text-sm font-medium text-gray-700">مربیان</div>
              </div>

              {/* Doctors */}
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {usersByRole ? formatNumber(usersByRole.doctors) : '۰'}
                </div>
                <div className="text-sm font-medium text-gray-700">پزشکان</div>
              </div>

              {/* Admins */}
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {usersByRole ? formatNumber(usersByRole.admins) : '۰'}
                </div>
                <div className="text-sm font-medium text-gray-700">مدیران سیستم</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}