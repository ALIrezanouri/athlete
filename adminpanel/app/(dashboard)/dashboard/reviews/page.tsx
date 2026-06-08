'use client';

import { useEffect, useState, useTransition } from 'react';
import { Search, Eye, Trash2, ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import type { GymReview, ActionResult, PaginatedResult } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

interface ReviewWithDetails extends GymReview {
  athlete_name: string;
  gym_name: string;
}

type ModalType = 'view' | 'delete' | null;

export default function ReviewsPage() {
  const [isPending, startTransition] = useTransition();

  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const itemsPerPage = 10;

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState<number | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);

  useEffect(() => {
    loadReviews();
  }, [currentPage, searchQuery, minRating]);

  const loadReviews = () => {
    startTransition(async () => {
      setLoading(true);
      setError(null);

      const { getAllReviews } = await import('@/app/actions/reviews');
      const result = await getAllReviews({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchQuery || undefined,
        minRating: minRating || undefined,
      });

      if (result.success && result.data) {
        setReviews(result.data.data);
        setTotalReviews(result.data.total);
      } else {
        setError(result.error || 'خطا در بارگذاری نظرات');
      }

      setLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRatingFilter = (rating: number | null) => {
    setMinRating(rating);
    setCurrentPage(1);
  };

  const openModal = (type: ModalType, review: ReviewWithDetails) => {
    setModalType(type);
    setSelectedReview(review);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedReview(null);
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    startTransition(async () => {
      const { deleteReview } = await import('@/app/actions/reviews');
      const result = await deleteReview(selectedReview.id);

      if (result.success) {
        setSuccessMessage('نظر با موفقیت حذف شد');
        closeModal();
        loadReviews();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در حذف نظر');
      }
    });
  };

  const totalPages = Math.ceil(totalReviews / itemsPerPage);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6" dir="rtl">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">نظرات باشگاه‌ها</h1>
        <p className="text-slate-400">مشاهده و مدیریت نظرات کاربران درباره باشگاه‌ها</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg backdrop-blur-sm">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="جستجو در نظرات..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-400"
          />
        </div>
        <MobileDrawerSelect
          value={String(minRating ?? '')}
          onChange={(v) => handleRatingFilter(v ? parseInt(v) : null)}
          placeholder="همه امتیازها"
          options={[
            { value: '', label: 'همه امتیازها' },
            { value: '1', label: '1+ ستاره' },
            { value: '2', label: '2+ ستاره' },
            { value: '3', label: '3+ ستاره' },
            { value: '4', label: '4+ ستاره' },
            { value: '5', label: '5 ستاره' },
          ]}
          dir="rtl"
        />
      </div>

      {/* Reviews Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">باشگاه</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">کاربر</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">امتیاز</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden md:table-cell">نظر</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">تاریخ</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    نظری یافت نشد
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{review.gym_name}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{review.athlete_name}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell max-w-xs truncate">
                      {review.comment || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                      {new Date(review.created_at).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', review)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => openModal('delete', review)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-sm text-slate-400">
              صفحه {currentPage} از {totalPages} ({totalReviews} نظر)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {modalType === 'view' && selectedReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">مشاهده نظر</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">باشگاه</label>
                <p className="text-white">{selectedReview.gym_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">کاربر</label>
                <p className="text-white">{selectedReview.athlete_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">امتیاز</label>
                <div className="flex items-center gap-1">
                  {renderStars(selectedReview.rating)}
                  <span className="text-white ml-2">{selectedReview.rating}/5</span>
                </div>
              </div>

              {selectedReview.comment && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">نظر</label>
                  <p className="text-white bg-white/5 p-3 rounded-lg">{selectedReview.comment}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ ایجاد</label>
                <p className="text-white">{new Date(selectedReview.created_at).toLocaleDateString('fa-IR')}</p>
              </div>

              <div className="pt-4">
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">تأیید حذف</h2>
            </div>

            <div className="p-4">
              <p className="text-slate-300 mb-2">
                آیا از حذف نظر کاربر «{selectedReview.athlete_name}» از باشگاه «{selectedReview.gym_name}» اطمینان دارید؟
              </p>
              <div className="flex items-center gap-1 mb-6">
                {renderStars(selectedReview.rating)}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteReview}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 rounded-lg transition-colors font-medium"
                >
                  {isPending ? 'در حال حذف...' : 'حذف'}
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}