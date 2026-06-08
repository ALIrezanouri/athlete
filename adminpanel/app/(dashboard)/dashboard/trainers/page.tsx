'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getAllTrainers, createTrainer, updateTrainer, deleteTrainer } from '@/app/actions/trainers';
import { getAllGyms } from '@/app/actions/gyms';
import type { GymTrainer, Gym } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface TrainerFormData {
  gym_id: string;
  name: string;
  specialty: string;
  photo_url: string;
}

const EMPTY_FORM: TrainerFormData = {
  gym_id: '',
  name: '',
  specialty: '',
  photo_url: '',
};

export default function TrainersPage() {
  const [isPending, startTransition] = useTransition();

  const [trainers, setTrainers] = useState<GymTrainer[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTrainers, setTotalTrainers] = useState(0);
  const itemsPerPage = 10;

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<GymTrainer | null>(null);
  const [formData, setFormData] = useState<TrainerFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<TrainerFormData>>({});

  useEffect(() => {
    loadTrainers();
    loadGyms();
  }, [currentPage]);

  const loadTrainers = () => {
    startTransition(async () => {
      setLoading(true);
      setError(null);

      const result = await getAllTrainers({
        page: currentPage,
        pageSize: itemsPerPage,
      });

      if (result.success && result.data) {
        setTrainers(result.data.data);
        setTotalTrainers(result.data.total);
      } else {
        setError(result.error || 'خطا در بارگذاری مربیان');
      }

      setLoading(false);
    });
  };

  const loadGyms = () => {
    startTransition(async () => {
      const result = await getAllGyms({ page: 1, pageSize: 100 });

      if (result.success && result.data) {
        setGyms(result.data.data);
      }
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const openModal = (type: ModalType, trainer?: GymTrainer) => {
    setModalType(type);
    setFormErrors({});

    if (trainer) {
      setSelectedTrainer(trainer);
      if (type === 'edit') {
        setFormData({
          gym_id: trainer.gym_id,
          name: trainer.name,
          specialty: trainer.specialty || '',
          photo_url: trainer.photo_url || '',
        });
      }
    } else if (type === 'create') {
      setSelectedTrainer(null);
      setFormData(EMPTY_FORM);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTrainer(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<TrainerFormData> = {};

    if (!formData.name.trim()) errors.name = 'نام الزامی است';
    if (!formData.gym_id) errors.gym_id = 'باشگاه الزامی است';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    startTransition(async () => {
      const result = await createTrainer({
        gym_id: formData.gym_id,
        name: formData.name,
        specialty: formData.specialty || null,
        photo_url: formData.photo_url || null,
      });

      if (result.success) {
        setSuccessMessage('مربی با موفقیت ایجاد شد');
        closeModal();
        loadTrainers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ایجاد مربی');
      }
    });
  };

  const handleUpdateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTrainer || !validateForm()) return;

    startTransition(async () => {
      const result = await updateTrainer(selectedTrainer.id, {
        gym_id: formData.gym_id,
        name: formData.name,
        specialty: formData.specialty || null,
        photo_url: formData.photo_url || null,
      });

      if (result.success) {
        setSuccessMessage('مربی با موفقیت ویرایش شد');
        closeModal();
        loadTrainers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ویرایش مربی');
      }
    });
  };

  const handleDeleteTrainer = async () => {
    if (!selectedTrainer) return;

    startTransition(async () => {
      const result = await deleteTrainer(selectedTrainer.id);

      if (result.success) {
        setSuccessMessage('مربی با موفقیت حذف شد');
        closeModal();
        loadTrainers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در حذف مربی');
      }
    });
  };

  const totalPages = Math.ceil(totalTrainers / itemsPerPage);

  // Helper: get gym name by id
  const getGymName = (gymId: string) => {
    const gym = gyms.find(g => g.id === gymId);
    return gym?.name || gymId;
  };

  // Filter trainers by search
  const filteredTrainers = searchQuery
    ? trainers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.specialty && t.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getGymName(t.gym_id).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : trainers;

  const inputClass = (hasError?: string) =>
    `w-full px-4 py-2.5 bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">مدیریت مربیان</h1>
        <p className="text-slate-400">مدیریت و مشاهده تمام مربیان باشگاه‌ها</p>
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

      {/* Search and Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="جستجوی مربی..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-400"
          />
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>افزودن مربی</span>
        </button>
      </div>

      {/* Trainers Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">نام</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden md:table-cell">تخصص</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">باشگاه</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    مربی یافت نشد
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((trainer) => (
                  <tr key={trainer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{trainer.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">
                      {trainer.specialty || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                      {getGymName(trainer.gym_id)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', trainer)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => openModal('edit', trainer)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-yellow-400" />
                        </button>
                        <button
                          onClick={() => openModal('delete', trainer)}
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
              صفحه {currentPage} از {totalPages}
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

      {/* Create/Edit Modal */}
      {(modalType === 'create' || modalType === 'edit') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">
                {modalType === 'create' ? 'افزودن مربی جدید' : 'ویرایش مربی'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={modalType === 'create' ? handleCreateTrainer : handleUpdateTrainer} className="p-4 space-y-4">
              {/* Gym Select */}
              <div>
                <label className="block text-sm font-medium mb-1.5">باشگاه *</label>
<MobileDrawerSelect
                  value={formData.gym_id}
                  onChange={(v) => setFormData({ ...formData, gym_id: v })}
                  placeholder="انتخاب باشگاه"
                  options={[{ value: '', label: 'انتخاب باشگاه' }, ...gyms.map((gym: any) => ({ value: gym.id, label: gym.name }))]}
                  dir="rtl"
                  error={!!formErrors.gym_id}
                />
                {formErrors.gym_id && <p className="text-red-400 text-sm mt-1">{formErrors.gym_id}</p>}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">نام *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass(formErrors.name)}
                />
                {formErrors.name && <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>}
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-sm font-medium mb-1.5">تخصص</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className={inputClass()}
                  placeholder="مثلا: بدنسازی، فیتنس، یوگا"
                />
              </div>

              {/* Photo URL */}
              <div>
                <label className="block text-sm font-medium mb-1.5">لینک تصویر</label>
                <input
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  className={inputClass()}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors font-medium"
                >
                  {isPending ? 'در حال ذخیره...' : 'ذخیره'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalType === 'view' && selectedTrainer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">مشاهده مربی</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">نام</label>
                <p className="text-white">{selectedTrainer.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">باشگاه</label>
                <p className="text-white">{getGymName(selectedTrainer.gym_id)}</p>
              </div>

              {selectedTrainer.specialty && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">تخصص</label>
                  <p className="text-white">{selectedTrainer.specialty}</p>
                </div>
              )}

              {selectedTrainer.photo_url && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">تصویر</label>
                  <img
                    src={selectedTrainer.photo_url}
                    alt={selectedTrainer.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ ایجاد</label>
                <p className="text-white">
                  {new Date(selectedTrainer.created_at).toLocaleDateString('fa-IR')}
                </p>
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
      {modalType === 'delete' && selectedTrainer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">تأیید حذف</h2>
            </div>

            <div className="p-4">
              <p className="text-slate-300 mb-6">
                آیا از حذف مربی «{selectedTrainer.name}» اطمینان دارید؟
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteTrainer}
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