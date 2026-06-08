'use client';

import { useState, useEffect, useTransition } from 'react';
import type { UserFollow, WorkoutLike, WorkoutComment, GymFavorite } from '@/app/actions/types';

type ModalType = 'delete' | null;
type TabType = 'follows' | 'likes' | 'comments' | 'favorites';

interface FollowRow extends UserFollow {
  follower_name?: string;
  following_name?: string;
}

interface LikeRow extends WorkoutLike {
  user_name?: string;
}

interface CommentRow extends WorkoutComment {
  user_name?: string;
}

interface FavoriteRow extends GymFavorite {
  athlete_name?: string;
  gym_name?: string;
}

const inputClass = (hasError?: boolean | string) =>
  `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-500' : 'border-white/10'} bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`;

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<TabType>('follows');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Follows
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [followsTotal, setFollowsTotal] = useState(0);
  const [followsPage, setFollowsPage] = useState(1);

  // Likes
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [likesTotal, setLikesTotal] = useState(0);
  const [likesPage, setLikesPage] = useState(1);

  // Comments
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [favoritesTotal, setFavoritesTotal] = useState(0);
  const [favoritesPage, setFavoritesPage] = useState(1);

  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedComment, setSelectedComment] = useState<CommentRow | null>(null);
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteRow | null>(null);

  useEffect(() => {
    if (activeTab === 'follows') loadFollows();
    else if (activeTab === 'likes') loadLikes();
    else if (activeTab === 'comments') loadComments();
    else loadFavorites();
  }, [activeTab, followsPage, likesPage, commentsPage, favoritesPage, search]);

  const loadFollows = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllFollows } = await import('@/app/actions/social');
      const result = await getAllFollows({ page: followsPage, pageSize, search: search || undefined });
      if (result.success && result.data) {
        const rows = result.data.data.map((f: any) => ({
          ...f,
          follower_name: f.follower?.full_name || '—',
          following_name: f.following?.full_name || '—',
        }));
        setFollows(rows);
        setFollowsTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const loadLikes = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllLikes } = await import('@/app/actions/social');
      const result = await getAllLikes({ page: likesPage, pageSize, search: search || undefined });
      if (result.success && result.data) {
        const rows = result.data.data.map((l: any) => ({
          ...l,
          user_name: l.profiles?.full_name || '—',
        }));
        setLikes(rows);
        setLikesTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const loadComments = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllComments } = await import('@/app/actions/social');
      const result = await getAllComments({ page: commentsPage, pageSize, search: search || undefined });
      if (result.success && result.data) {
        const rows = result.data.data.map((c: any) => ({
          ...c,
          user_name: c.profiles?.full_name || '—',
        }));
        setComments(rows);
        setCommentsTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const loadFavorites = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllFavorites } = await import('@/app/actions/social');
      const result = await getAllFavorites({ page: favoritesPage, pageSize, search: search || undefined });
      if (result.success && result.data) {
        const rows = result.data.data.map((f: any) => ({
          ...f,
          athlete_name: f.athlete?.full_name || '—',
          gym_name: f.gym?.name || '—',
        }));
        setFavorites(rows);
        setFavoritesTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFollowsPage(1);
    setLikesPage(1);
    setCommentsPage(1);
    setFavoritesPage(1);
  };

  const openDeleteModal = (comment: CommentRow) => {
    setModalType('delete');
    setSelectedComment(comment);
    setSelectedFavorite(null);
  };

  const openDeleteFavoriteModal = (favorite: FavoriteRow) => {
    setModalType('delete');
    setSelectedFavorite(favorite);
    setSelectedComment(null);
  };

  const handleDeleteComment = () => {
    if (!selectedComment) return;
    startTransition(async () => {
      const { deleteComment } = await import('@/app/actions/social');
      const result = await deleteComment(selectedComment.id);
      if (result.success) {
        closeModal();
        loadComments();
      }
    });
  };

  const handleDeleteFavorite = () => {
    if (!selectedFavorite) return;
    startTransition(async () => {
      const { deleteFavorite } = await import('@/app/actions/social');
      const result = await deleteFavorite(selectedFavorite.id);
      if (result.success) {
        closeModal();
        loadFavorites();
      }
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedComment(null);
    setSelectedFavorite(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const getCurrentPage = () => {
    if (activeTab === 'follows') return followsPage;
    if (activeTab === 'likes') return likesPage;
    if (activeTab === 'comments') return commentsPage;
    return favoritesPage;
  };

  const setCurrentPage = (p: number) => {
    if (activeTab === 'follows') setFollowsPage(p);
    else if (activeTab === 'likes') setLikesPage(p);
    else if (activeTab === 'comments') setCommentsPage(p);
    else setFavoritesPage(p);
  };

  const getTotal = () => {
    if (activeTab === 'follows') return followsTotal;
    if (activeTab === 'likes') return likesTotal;
    if (activeTab === 'comments') return commentsTotal;
    return favoritesTotal;
  };

  const totalPages = Math.ceil(getTotal() / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">شبکه اجتماعی</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['follows', 'likes', 'comments', 'favorites'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearch(''); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {tab === 'follows' ? 'دنبال‌کردن‌ها' : tab === 'likes' ? 'لایک‌ها' : tab === 'comments' ? 'نظرات' : 'باشگاه‌های مورد علاقه'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="جستجو..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={inputClass()}
        />
      </div>

      {/* Follows Table */}
      {activeTab === 'follows' && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">دنبال‌کننده</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">دنبال‌شده</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td></tr>
              ) : follows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">دنبال‌کردنی یافت نشد</td></tr>
              ) : follows.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{f.follower_name}</td>
                  <td className="px-4 py-3 text-white">{f.following_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(f.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Likes Table */}
      {activeTab === 'likes' && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">کاربر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">جلسه تمرین</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td></tr>
              ) : likes.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">لایکی یافت نشد</td></tr>
              ) : likes.map((l) => (
                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{l.user_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{l.workout_session_id.substring(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comments Table */}
      {activeTab === 'comments' && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">کاربر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">نظر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden md:table-cell">جلسه</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">تاریخ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td></tr>
              ) : comments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">نظری یافت نشد</td></tr>
              ) : comments.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{c.user_name}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{c.comment}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm hidden md:table-cell">{c.workout_session_id.substring(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-300 text-sm hidden lg:table-cell">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDeleteModal(c)}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Favorites Table */}
      {activeTab === 'favorites' && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">ورزشکار</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">باشگاه</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 hidden lg:table-cell">تاریخ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td></tr>
              ) : favorites.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">باشگاه مورد علاقه‌ای یافت نشد</td></tr>
              ) : favorites.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{f.athlete_name}</td>
                  <td className="px-4 py-3 text-white">{f.gym_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm hidden lg:table-cell">{formatDate(f.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDeleteFavoriteModal(f)}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, getCurrentPage() - 1))}
            disabled={getCurrentPage() === 1}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            قبلی
          </button>
          <span className="px-4 py-2 text-gray-300">
            صفحه {getCurrentPage()} از {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, getCurrentPage() + 1))}
            disabled={getCurrentPage() === totalPages}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            بعدی
          </button>
        </div>
      )}

      {/* Delete Comment Modal */}
      {modalType === 'delete' && selectedComment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">حذف نظر</h2>
            <p className="text-gray-300 mb-2">
              کاربر: <span className="text-white font-medium">{selectedComment.user_name}</span>
            </p>
            <p className="text-gray-300 mb-6 bg-white/5 rounded-lg p-3">
              {selectedComment.comment}
            </p>
            <p className="text-gray-400 text-sm mb-6">این عمل غیرقابل بازگشت است.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDeleteComment}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isPending ? 'در حال حذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Favorite Modal */}
      {modalType === 'delete' && selectedFavorite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">حذف باشگاه مورد علاقه</h2>
            <p className="text-gray-300 mb-2">
              ورزشکار: <span className="text-white font-medium">{selectedFavorite.athlete_name}</span>
            </p>
            <p className="text-gray-300 mb-2">
              باشگاه: <span className="text-white font-medium">{selectedFavorite.gym_name}</span>
            </p>
            <p className="text-gray-400 text-sm mb-6">این عمل غیرقابل بازگشت است.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDeleteFavorite}
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