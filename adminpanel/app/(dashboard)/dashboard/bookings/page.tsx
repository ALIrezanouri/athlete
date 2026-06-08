'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllBookings, updateBookingStatus } from '@/app/actions/bookings';
import type { Booking, PaginatedResult } from '@/app/actions/types';
import { gregorianToJalali, formatJalaliDateTime } from '@/lib/jalali';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

interface BookingWithDetails extends Booking {
  user_name?: string;
  user_phone?: string;
  gym_name?: string;
  gym_address?: string;
  time_slot_date?: string;
  time_slot_start?: string;
  time_slot_end?: string;
  check_in_code?: string;
}

type StatusFilter = 'all' | 'upcoming' | 'active' | 'completed' | 'cancelled' | 'expired';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'همه',
  upcoming: 'در انتظار',
  active: 'فعال',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
  expired: 'منقضی شده',
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status') as StatusFilter || 'all';
    setCurrentPage(page);
    setStatusFilter(status);
    loadBookings(page, status);
  }, [searchParams]);

  const loadBookings = async (page: number, status: StatusFilter) => {
    try {
      setError(null);
      const result = await getAllBookings({
        page,
        limit: itemsPerPage,
        status: status === 'all' ? undefined : status,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setBookings(result.data.data as BookingWithDetails[]);
        setTotalCount(result.data.total);
      }
    } catch (err) {
      setError('خطا در بارگذاری رزروها');
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const handleStatusFilterChange = (newStatus: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', newStatus);
    params.set('page', '1');
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, newStatus as any);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage('وضعیت رزرو با موفقیت تغییر کرد');
        loadBookings(currentPage, statusFilter);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as StatusFilter] || status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return formatJalaliDateTime(dateString);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">مدیریت رزروها</h1>
          <p className="text-purple-200">مشاهده و مدیریت تمام رزروهای باشگاه</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-lg border border-green-500/30 rounded-xl text-green-200">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-lg border border-red-500/30 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-purple-200 mb-2">فیلتر بر اساس وضعیت</label>
<MobileDrawerSelect
            value={statusFilter}
            onChange={(v) => handleStatusFilterChange(v as StatusFilter)}
            placeholder="فیلتر وضعیت"
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            dir="rtl"
          />
        </div>

        {/* Bookings Table */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">کاربر</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">باشگاه</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">زمان</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">کد ورود</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">وضعیت</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">تاریخ رزرو</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-purple-200">
                      هیچ رزروی یافت نشد
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{booking.user_name || 'نامشخص'}</div>
                        <div className="text-sm text-purple-200">{booking.user_phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{booking.gym_name || 'نامشخص'}</div>
                        <div className="text-sm text-purple-200">{booking.gym_address || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white" dir="ltr">{gregorianToJalali(booking.time_slot_date)}</div>
                        <div className="text-sm text-purple-200">
                          {formatTime(booking.time_slot_start || '')} - {formatTime(booking.time_slot_end || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(booking as any).check_in_code ? (
                          <span className="font-mono text-sm bg-purple-500/20 text-purple-200 px-2 py-1 rounded-lg tracking-wider">
                            {(booking as any).check_in_code}
                          </span>
                        ) : (
                          <span className="text-purple-200/40 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
<MobileDrawerSelect
                          value={booking.status}
                          onChange={(v) => handleStatusUpdate(booking.id, v)}
                          placeholder="تغییر وضعیت"
                          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                          dir="rtl"
                        />
                      </td>
                      <td className="px-6 py-4 text-white">{formatDate(booking.booked_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-purple-200">
                صفحه {currentPage} از {totalPages} ({totalCount} رزرو)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  قبلی
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {selectedBooking && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedBooking(null)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 to-purple-900 border border-white/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">جزئیات رزرو</h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">کاربر</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-purple-300 mb-1">نام</div>
                      <div className="text-white font-medium">{selectedBooking.user_name || 'نامشخص'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-purple-300 mb-1">شماره تماس</div>
                      <div className="text-white font-medium">{selectedBooking.user_phone || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Check-in Code */}
                {(selectedBooking as any).check_in_code && (
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-purple-200 mb-4">کد ورود</h3>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl text-white tracking-[0.3em] bg-purple-500/20 px-4 py-2 rounded-xl">
                        {(selectedBooking as any).check_in_code}
                      </span>
                    </div>
                  </div>
                )}

                {/* Gym Info */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">باشگاه</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-purple-300 mb-1">نام</div>
                      <div className="text-white font-medium">{selectedBooking.gym_name || 'نامشخص'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-purple-300 mb-1">آدرس</div>
                      <div className="text-white font-medium">{selectedBooking.gym_address || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Time Slot Info */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">زمان</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-purple-300 mb-1">روز</div>
                      <div className="text-white font-medium" dir="ltr">{gregorianToJalali(selectedBooking.time_slot_date)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-purple-300 mb-1">ساعت</div>
                      <div className="text-white font-medium">
                        {formatTime(selectedBooking.time_slot_start || '')} - {formatTime(selectedBooking.time_slot_end || '')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">وضعیت</h3>
                  <div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[selectedBooking.status] || 'bg-gray-100 text-gray-800'}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                  </div>
                </div>

                {/* Booking Date */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">تاریخ رزرو</h3>
                  <div className="text-white font-medium">{formatDate(selectedBooking.booked_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}