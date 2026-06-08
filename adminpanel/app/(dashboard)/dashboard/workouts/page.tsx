'use client';

import { useState, useEffect, useTransition } from 'react';
import type { WorkoutSession, WorkoutExercise, WorkoutSet } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'view' | null;

interface WorkoutSessionRow extends WorkoutSession {
  user_name?: string;
}

interface WorkoutExerciseDetail extends WorkoutExercise {
  workout_sets: WorkoutSet[];
}

interface WorkoutSessionDetail extends WorkoutSession {
  user_name?: string;
  workout_exercises: WorkoutExerciseDetail[];
}

const STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  completed: 'تکمیل شده',
  discarded: 'لغو شده',
};

const inputClass = (hasError?: boolean | string) =>
  `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-500' : 'border-white/10'} bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`;

export default function WorkoutsPage() {
  const [sessions, setSessions] = useState<WorkoutSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSession, setSelectedSession] = useState<WorkoutSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [page, search, statusFilter]);

  const loadSessions = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllWorkoutSessions } = await import('@/app/actions/workouts');
      const result = await getAllWorkoutSessions({
        page,
        pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (result.success && result.data) {
        const rows = result.data.data.map((s: any) => ({
          ...s,
          user_name: s.profiles?.full_name || '—',
        }));
        setSessions(rows);
        setTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const openViewModal = (sessionId: string) => {
    setModalType('view');
    setDetailLoading(true);
    startTransition(async () => {
      const { getWorkoutSessionDetail } = await import('@/app/actions/workouts');
      const result = await getWorkoutSessionDetail(sessionId);
      if (result.success && result.data) {
        const detail = result.data as any;
        setSelectedSession({
          ...detail,
          user_name: detail.profiles?.full_name || '—',
          workout_exercises: (detail.workout_exercises || []).map((ex: any) => ({
            ...ex,
            workout_sets: ex.workout_sets || [],
          })),
        });
      }
      setDetailLoading(false);
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSession(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('fa-IR');
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ساعت ${m} دقیقه`;
    return `${m} دقیقه`;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">جلسات تمرین</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="جستجو نام کاربر / جلسه..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className={inputClass()}
          />
        </div>
        <div className="w-full md:w-48">
          <MobileDrawerSelect
            value={statusFilter}
            onChange={handleStatusFilter}
            placeholder="همه وضعیت‌ها"
            options={[
              { value: '', label: 'همه وضعیت‌ها' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
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
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">نام جلسه</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">شروع</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">مدت</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">حجم</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden md:table-cell">ست‌ها</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">وضعیت</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">جلسه‌ای یافت نشد</td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{session.user_name}</td>
                  <td className="px-4 py-3 text-white">{session.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {formatDate(session.start_time)}
                    <br />
                    <span className="text-gray-400">{formatTime(session.start_time)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">
                    {formatDuration(session.duration_seconds)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">
                    {session.total_volume ? `${session.total_volume} kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{session.total_sets || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      session.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      session.status === 'discarded' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {STATUS_LABELS[session.status] || session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openViewModal(session.id)}
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
      {modalType === 'view' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="text-center text-gray-400 py-8">در حال بارگذاری جزئیات...</div>
            ) : selectedSession ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">جزئیات جلسه تمرین</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Session Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 rounded-lg p-4">
                  <div>
                    <span className="text-gray-400 text-sm">کاربر:</span>
                    <p className="text-white">{selectedSession.user_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">نام جلسه:</span>
                    <p className="text-white">{selectedSession.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">شروع:</span>
                    <p className="text-white">{formatDate(selectedSession.start_time)} {formatTime(selectedSession.start_time)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">پایان:</span>
                    <p className="text-white">{selectedSession.end_time ? `${formatDate(selectedSession.end_time)} ${formatTime(selectedSession.end_time)}` : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">مدت:</span>
                    <p className="text-white">{formatDuration(selectedSession.duration_seconds)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">وضعیت:</span>
                    <p className="text-white">{STATUS_LABELS[selectedSession.status] || selectedSession.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">حجم کل:</span>
                    <p className="text-white">{selectedSession.total_volume ? `${selectedSession.total_volume} kg` : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">ست‌ها:</span>
                    <p className="text-white">{selectedSession.total_sets || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">کالری تخمینی:</span>
                    <p className="text-white">{selectedSession.estimated_calories || '—'}</p>
                  </div>
                  {selectedSession.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-400 text-sm">یادداشت:</span>
                      <p className="text-white">{selectedSession.notes}</p>
                    </div>
                  )}
                </div>

                {/* Exercises Tree */}
                <h3 className="text-lg font-semibold text-white mb-4">تمرینات و ست‌ها</h3>
                {selectedSession.workout_exercises?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSession.workout_exercises.map((ex, idx) => (
                      <div key={ex.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-medium">
                            {idx + 1}. {ex.exercise_name}
                          </h4>
                          {ex.is_superset && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                              سوپرست ({ex.superset_group_id})
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-gray-400 text-sm mb-2">{ex.notes}</p>
                        )}
                        {ex.workout_sets?.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="text-right py-1">ست</th>
                                <th className="text-right py-1">وزن</th>
                                <th className="text-right py-1">تکرار</th>
                                <th className="text-right py-1 hidden md:table-cell">RPE</th>
                                <th className="text-center py-1">وضعیت</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {ex.workout_sets.map((set) => (
                                <tr key={set.id} className="text-gray-300">
                                  <td className="py-1">{set.set_number}{set.set_type === 'warmup' ? ' 🔥' : ''}</td>
                                  <td className="py-1">{set.weight_kg ? `${set.weight_kg} kg` : '—'}</td>
                                  <td className="py-1">{set.reps || '—'}</td>
                                  <td className="py-1 hidden md:table-cell">{set.rpe || '—'}</td>
                                  <td className="py-1 text-center">
                                    {set.is_completed ? (
                                      <span className="text-green-400">✓</span>
                                    ) : (
                                      <span className="text-gray-500">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-gray-500 text-sm">ست‌ی ثبت نشده</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">تمرینی ثبت نشده</p>
                )}
              </>
            ) : (
              <div className="text-center text-red-400 py-8">خطا در بارگذاری جزئیات</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}