'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Routine, RoutineDay, RoutineExercise, RoutineSet } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'view' | 'delete' | null;

interface RoutineRow extends Routine {
  user_name?: string;
}

interface RoutineDetail {
  routine: Routine;
  user_name: string;
  days: Array<RoutineDay & { exercises: Array<RoutineExercise & { sets: RoutineSet[] }> }>;
}

const inputClass = (hasError?: boolean | string) =>
  `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-500' : 'border-white/10'} bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`;

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [publicFilter, setPublicFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineRow | null>(null);
  const [routineDetail, setRoutineDetail] = useState<RoutineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, [page, search, publicFilter, templateFilter]);

  const loadRoutines = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllRoutines } = await import('@/app/actions/routines');
      const result = await getAllRoutines({
        page,
        pageSize,
        search: search || undefined,
        isPublic: publicFilter === 'true' ? true : publicFilter === 'false' ? false : undefined,
        isTemplate: templateFilter === 'true' ? true : templateFilter === 'false' ? false : undefined,
      });
      if (result.success && result.data) {
        const rows = result.data.data.map((r: any) => ({
          ...r,
          user_name: r.profiles?.full_name || '—',
        }));
        setRoutines(rows);
        setTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openViewModal = (routineId: string) => {
    setModalType('view');
    setDetailLoading(true);
    startTransition(async () => {
      const { getRoutineDetail } = await import('@/app/actions/routines');
      const result = await getRoutineDetail(routineId);
      if (result.success && result.data) {
        setRoutineDetail(result.data);
      }
      setDetailLoading(false);
    });
  };

  const openDeleteModal = (routine: RoutineRow) => {
    setModalType('delete');
    setSelectedRoutine(routine);
  };

  const handleDelete = () => {
    if (!selectedRoutine) return;
    startTransition(async () => {
      const { deleteRoutine } = await import('@/app/actions/routines');
      const result = await deleteRoutine(selectedRoutine.id);
      if (result.success) {
        closeModal();
        loadRoutines();
      }
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedRoutine(null);
    setRoutineDetail(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">برنامه‌های تمرین</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="جستجو نام برنامه / کاربر..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className={inputClass()}
          />
        </div>
        <div className="w-full md:w-48">
          <MobileDrawerSelect
            value={publicFilter}
            onChange={(v) => { setPublicFilter(v); setPage(1); }}
            placeholder="همه (عمومی/خصوصی)"
            options={[
              { value: '', label: 'همه (عمومی/خصوصی)' },
              { value: 'true', label: 'عمومی' },
              { value: 'false', label: 'خصوصی' },
            ]}
            dir="rtl"
          />
        </div>
        <div className="w-full md:w-48">
          <MobileDrawerSelect
            value={templateFilter}
            onChange={(v) => { setTemplateFilter(v); setPage(1); }}
            placeholder="همه (قالب/عادی)"
            options={[
              { value: '', label: 'همه (قالب/عادی)' },
              { value: 'true', label: 'قالب' },
              { value: 'false', label: 'عادی' },
            ]}
            dir="rtl"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">کاربر</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">نام برنامه</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">عمومی</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">قالب</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden md:table-cell">استفاده</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden md:table-cell">تاریخ</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td>
              </tr>
            ) : routines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">برنامه‌ای یافت نشد</td>
              </tr>
            ) : (
              routines.map((routine) => (
                <tr key={routine.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{routine.user_name}</td>
                  <td className="px-4 py-3 text-white">{routine.name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      routine.is_public ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {routine.is_public ? 'عمومی' : 'خصوصی'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      routine.is_template ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {routine.is_template ? 'قالب' : 'عادی'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{routine.use_count || 0}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm hidden md:table-cell">{formatDate(routine.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openViewModal(routine.id)}
                      className="text-blue-400 hover:text-blue-300 transition-colors text-sm ml-2"
                    >
                      مشاهده
                    </button>
                    <button
                      onClick={() => openDeleteModal(routine)}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      حذف
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
      {modalType === 'view' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="text-center text-gray-400 py-8">در حال بارگذاری جزئیات...</div>
            ) : routineDetail ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">جزئیات برنامه تمرین</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Routine Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 rounded-lg p-4">
                  <div>
                    <span className="text-gray-400 text-sm">کاربر:</span>
                    <p className="text-white">{routineDetail.user_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">نام برنامه:</span>
                    <p className="text-white">{routineDetail.routine.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">عمومی:</span>
                    <p className="text-white">{routineDetail.routine.is_public ? 'بله' : 'خیر'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">قالب:</span>
                    <p className="text-white">{routineDetail.routine.is_template ? 'بله' : 'خیر'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">دفعات استفاده:</span>
                    <p className="text-white">{routineDetail.routine.use_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">پوشه:</span>
                    <p className="text-white">{routineDetail.routine.folder || '—'}</p>
                  </div>
                  {routineDetail.routine.description && (
                    <div className="col-span-2">
                      <span className="text-gray-400 text-sm">توضیحات:</span>
                      <p className="text-white">{routineDetail.routine.description}</p>
                    </div>
                  )}
                </div>

                {/* Days/Exercises/Set Tree */}
                <h3 className="text-lg font-semibold text-white mb-4">روزها و تمرینات</h3>
                {routineDetail.days?.length > 0 ? (
                  <div className="space-y-4">
                    {routineDetail.days.map((day) => (
                      <div key={day.id} className="bg-white/5 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-3">📅 {day.name}</h4>
                        {day.exercises?.length > 0 ? (
                          <div className="space-y-3">
                            {day.exercises.map((ex, idx) => (
                              <div key={ex.id} className="bg-white/5 rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-white text-sm">
                                    {idx + 1}. {ex.exercise_name}
                                  </span>
                                  {ex.rest_seconds > 0 && (
                                    <span className="text-gray-400 text-xs">
                                      استراحت: {ex.rest_seconds}s
                                    </span>
                                  )}
                                </div>
                                {ex.notes && (
                                  <p className="text-gray-400 text-xs mb-2">{ex.notes}</p>
                                )}
                                {ex.sets?.length > 0 ? (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-gray-400">
                                        <th className="text-right py-1">ست</th>
                                        <th className="text-right py-1">نوع</th>
                                        <th className="text-right py-1">وزن</th>
                                        <th className="text-right py-1">تکرار</th>
                                        <th className="text-right py-1 hidden md:table-cell">RPE</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {ex.sets.map((set) => (
                                        <tr key={set.id} className="text-gray-300">
                                          <td className="py-1">{set.set_number}</td>
                                          <td className="py-1">{set.set_type}</td>
                                          <td className="py-1">{set.weight_kg ? `${set.weight_kg} kg` : '—'}</td>
                                          <td className="py-1">{set.reps || '—'}</td>
                                          <td className="py-1 hidden md:table-cell">{set.rpe || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-gray-500 text-xs">ست‌ی تعریف نشده</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">تمرینی تعریف نشده</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">روزی تعریف نشده</p>
                )}
              </>
            ) : (
              <div className="text-center text-red-400 py-8">خطا در بارگذاری جزئیات</div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalType === 'delete' && selectedRoutine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">حذف برنامه تمرین</h2>
            <p className="text-gray-300 mb-6">
              آیا مطمئن هستید که برنامه <span className="text-white font-medium">{selectedRoutine.name}</span> را حذف می‌کنید؟ این عمل غیرقابل بازگشت است.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isPending ? 'در حال حذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}