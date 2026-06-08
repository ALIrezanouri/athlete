'use client';

import { useState, useEffect, useTransition } from 'react';
import type { BodyMeasurement } from '@/app/actions/types';

type ModalType = 'view' | null;

interface BodyMeasurementRow extends BodyMeasurement {
  user_name?: string;
}

const inputClass = (hasError?: boolean | string) =>
  `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-500' : 'border-white/10'} bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`;

export default function BodyStatsPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurementRow | null>(null);

  useEffect(() => {
    loadMeasurements();
  }, [page, search]);

  const loadMeasurements = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllBodyMeasurements } = await import('@/app/actions/workouts');
      const result = await getAllBodyMeasurements({
        page,
        pageSize,
        search: search || undefined,
      });
      if (result.success && result.data) {
        const rows = result.data.data.map((m: any) => ({
          ...m,
          user_name: m.profiles?.full_name || '—',
        }));
        setMeasurements(rows);
        setTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openViewModal = (measurement: BodyMeasurementRow) => {
    setModalType('view');
    setSelectedMeasurement(measurement);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedMeasurement(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">اندازه‌های بدن</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="جستجو نام کاربر..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className={inputClass()}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">کاربر</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">تاریخ</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">وزن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">چربی بدن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">سینه</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">کمر</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden md:table-cell">شانه</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td>
              </tr>
            ) : measurements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">اندازه‌ای یافت نشد</td>
              </tr>
            ) : (
              measurements.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{m.user_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(m.measured_at)}</td>
                  <td className="px-4 py-3 text-gray-300">{m.weight_kg ? `${m.weight_kg} kg` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{m.body_fat_percentage ? `${m.body_fat_percentage}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{m.chest_cm ? `${m.chest_cm} cm` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{m.waist_cm ? `${m.waist_cm} cm` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{m.shoulders_cm ? `${m.shoulders_cm} cm` : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openViewModal(m)}
                      className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
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
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            قبلی
          </button>
          <span className="px-4 py-2 text-gray-300">
            صفحه {page} از {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            بعدی
          </button>
        </div>
      )}

      {/* View Modal */}
      {modalType === 'view' && selectedMeasurement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-white">جزئیات اندازه‌های بدن</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-lg p-4">
              <div>
                <span className="text-gray-400 text-sm">کاربر:</span>
                <p className="text-white">{selectedMeasurement.user_name}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">تاریخ اندازه‌گیری:</span>
                <p className="text-white">{formatDate(selectedMeasurement.measured_at)}</p>
              </div>

              <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
                <h3 className="text-white font-medium mb-3">اندازه‌های اصلی</h3>
              </div>

              <div>
                <span className="text-gray-400 text-sm">وزن:</span>
                <p className="text-white">{selectedMeasurement.weight_kg ? `${selectedMeasurement.weight_kg} kg` : '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">چربی بدن:</span>
                <p className="text-white">{selectedMeasurement.body_fat_percentage ? `${selectedMeasurement.body_fat_percentage}%` : '—'}</p>
              </div>

              <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
                <h3 className="text-white font-medium mb-3">اندازه‌های دور</h3>
              </div>

              {[
                ['گردن', selectedMeasurement.neck_cm],
                ['سینه', selectedMeasurement.chest_cm],
                ['شانه', selectedMeasurement.shoulders_cm],
                ['کمر', selectedMeasurement.waist_cm],
                ['لگن', selectedMeasurement.hip_cm],
                ['بازو راست', selectedMeasurement.right_bicep_cm],
                ['بازو چپ', selectedMeasurement.left_bicep_cm],
                ['ران راست', selectedMeasurement.right_thigh_cm],
                ['ران چپ', selectedMeasurement.left_thigh_cm],
                ['ساق راست', selectedMeasurement.right_calf_cm],
                ['ساق چپ', selectedMeasurement.left_calf_cm],
                ['مچ راست', selectedMeasurement.right_forearm_cm],
                ['مچ چپ', selectedMeasurement.left_forearm_cm],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span className="text-gray-400 text-sm">{label}:</span>
                  <p className="text-white">{value ? `${value} cm` : '—'}</p>
                </div>
              ))}

              {selectedMeasurement.notes && (
                <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
                  <span className="text-gray-400 text-sm">یادداشت:</span>
                  <p className="text-white">{selectedMeasurement.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}