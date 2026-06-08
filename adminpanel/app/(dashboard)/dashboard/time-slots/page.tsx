'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getAllTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '@/app/actions/time-slots';
import { getAllGyms } from '@/app/actions/gyms';
import type { GymTimeSlot, Gym } from '@/app/actions/types';
import JalaliDatePicker from '@/components/ui/jalali-date-picker';
import { gregorianToJalali, formatJalaliDateTime } from '@/lib/jalali';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface TimeSlotFormData {
  gym_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: string;
  is_available: boolean;
}

const EMPTY_FORM: TimeSlotFormData = {
  gym_id: '',
  date: '',
  start_time: '08:00',
  end_time: '09:00',
  capacity: '20',
  is_available: true,
};

export default function TimeSlotsPage() {
  const [isPending, startTransition] = useTransition();

  const [timeSlots, setTimeSlots] = useState<GymTimeSlot[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSlots, setTotalSlots] = useState(0);
  const itemsPerPage = 10;

  // Search / filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGymId, setFilterGymId] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSlot, setSelectedSlot] = useState<GymTimeSlot | null>(null);
  const [formData, setFormData] = useState<TimeSlotFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<TimeSlotFormData>>({});

  useEffect(() => {
    loadTimeSlots();
    loadGyms();
  }, [currentPage, filterGymId]);

  const loadTimeSlots = () => {
    startTransition(async () => {
      setLoading(true);
      setError(null);

      const result = await getAllTimeSlots({
        page: currentPage,
        pageSize: itemsPerPage,
      });

      if (result.success && result.data) {
        setTimeSlots(result.data.data);
        setTotalSlots(result.data.total);
      } else {
        setError(result.error || 'خطا در بارگذاری زمان‌بندی‌ها');
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

  const handleGymFilter = (gymId: string) => {
    setFilterGymId(gymId);
    setCurrentPage(1);
  };

  const openModal = (type: ModalType, slot?: GymTimeSlot) => {
    setModalType(type);
    setFormErrors({});

    if (slot) {
      setSelectedSlot(slot);
      if (type === 'edit') {
        setFormData({
          gym_id: slot.gym_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          capacity: slot.capacity.toString(),
          is_available: slot.is_available,
        });
      }
    } else if (type === 'create') {
      setSelectedSlot(null);
      setFormData(EMPTY_FORM);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSlot(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<TimeSlotFormData> = {};

    if (!formData.gym_id) errors.gym_id = 'باشگاه الزامی است';
    if (!formData.date.trim()) errors.date = 'تاریخ الزامی است';
    if (!formData.start_time.trim()) errors.start_time = 'ساعت شروع الزامی است';
    if (!formData.end_time.trim()) errors.end_time = 'ساعت پایان الزامی است';
    if (!formData.capacity || parseInt(formData.capacity) <= 0) errors.capacity = 'ظرفیت باید عدد مثبت باشد';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    startTransition(async () => {
      const result = await createTimeSlot({
        gym_id: formData.gym_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: parseInt(formData.capacity),
      });

      if (result.success) {
        setSuccessMessage('زمان‌بندی با موفقیت ایجاد شد');
        closeModal();
        loadTimeSlots();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ایجاد زمان‌بندی');
      }
    });
  };

  const handleUpdateTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot || !validateForm()) return;

    startTransition(async () => {
      const result = await updateTimeSlot(selectedSlot.id, {
        gym_id: formData.gym_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: parseInt(formData.capacity),
        is_available: formData.is_available,
      });

      if (result.success) {
        setSuccessMessage('زمان‌بندی با موفقیت ویرایش شد');
        closeModal();
        loadTimeSlots();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ویرایش زمان‌بندی');
      }
    });
  };

  const handleDeleteTimeSlot = async () => {
    if (!selectedSlot) return;

    startTransition(async () => {
      const result = await deleteTimeSlot(selectedSlot.id);

      if (result.success) {
        setSuccessMessage('زمان‌بندی با موفقیت حذف شد');
        closeModal();
        loadTimeSlots();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در حذف زمان‌بندی');
      }
    });
  };

  const totalPages = Math.ceil(totalSlots / itemsPerPage);

  // Helper: get gym name by id
  const getGymName = (gymId: string) => {
    const gym = gyms.find(g => g.id === gymId);
    return gym?.name || gymId;
  };

  // Filter slots by search and gym filter
  const filteredSlots = timeSlots.filter(slot => {
    const matchesSearch = searchQuery
      ? slot.date.includes(searchQuery) ||
        slot.start_time.includes(searchQuery) ||
        getGymName(slot.gym_id).toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesGym = filterGymId ? slot.gym_id === filterGymId : true;
    return matchesSearch && matchesGym;
  });

  const inputClass = (hasError?: string) =>
    `w-full px-4 py-2.5 bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">مدیریت زمان‌بندی‌ها</h1>
        <p className="text-slate-400">مدیریت و مشاهده تمام زمان‌بندی‌های باشگاه‌ها</p>
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

      {/* Search, Filter, and Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="جستجوی زمان‌بندی..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-400"
          />
        </div>
<MobileDrawerSelect
          value={filterGymId}
          onChange={handleGymFilter}
          placeholder="همه باشگاه‌ها"
          options={[{ value: '', label: 'همه باشگاه‌ها' }, ...gyms.map((gym: any) => ({ value: gym.id, label: gym.name }))]}
          dir="rtl"
        />
        <button
          onClick={() => openModal('create')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>افزودن زمان‌بندی</span>
        </button>
      </div>

      {/* Time Slots Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">باشگاه</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">تاریخ</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden md:table-cell">ساعت شروع</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden md:table-cell">ساعت پایان</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">ظرفیت</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">رزرو شده</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">وضعیت</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    زمان‌بندی یافت نشد
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr key={slot.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{getGymName(slot.gym_id)}</td>
                    <td className="px-4 py-3 text-sm" dir="ltr">{gregorianToJalali(slot.date)}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">{slot.start_time}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">{slot.end_time}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">{slot.capacity}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">{slot.booked_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${slot.is_available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {slot.is_available ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', slot)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => openModal('edit', slot)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-yellow-400" />
                        </button>
                        <button
                          onClick={() => openModal('delete', slot)}
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
                {modalType === 'create' ? 'افزودن زمان‌بندی جدید' : 'ویرایش زمان‌بندی'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={modalType === 'create' ? handleCreateTimeSlot : handleUpdateTimeSlot} className="p-4 space-y-4">
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

              {/* Date */}
              <JalaliDatePicker
                value={formData.date}
                onChange={(gregorianDate) => setFormData({ ...formData, date: gregorianDate })}
                label="تاریخ"
                required
                error={formErrors.date}
              />

              {/* Start Time + End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">ساعت شروع *</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className={inputClass(formErrors.start_time)}
                  />
                  {formErrors.start_time && <p className="text-red-400 text-sm mt-1">{formErrors.start_time}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">ساعت پایان *</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className={inputClass(formErrors.end_time)}
                  />
                  {formErrors.end_time && <p className="text-red-400 text-sm mt-1">{formErrors.end_time}</p>}
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium mb-1.5">ظرفیت *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className={inputClass(formErrors.capacity)}
                />
                {formErrors.capacity && <p className="text-red-400 text-sm mt-1">{formErrors.capacity}</p>}
              </div>

              {/* Is Available toggle (only for edit) */}
              {modalType === 'edit' && (
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium">زمان‌بندی فعال است</span>
                </div>
              )}

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
      {modalType === 'view' && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">مشاهده زمان‌بندی</h2>
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
                <p className="text-white">{getGymName(selectedSlot.gym_id)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ</label>
                <p className="text-white" dir="ltr">{gregorianToJalali(selectedSlot.date)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">ساعت شروع</label>
                <p className="text-white">{selectedSlot.start_time}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">ساعت پایان</label>
                <p className="text-white">{selectedSlot.end_time}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">ظرفیت</label>
                <p className="text-white">{selectedSlot.capacity}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">رزرو شده</label>
                <p className="text-white">{selectedSlot.booked_count}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">وضعیت</label>
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${selectedSlot.is_available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {selectedSlot.is_available ? 'فعال' : 'غیرفعال'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ ایجاد</label>
                <p className="text-white">
                  {formatJalaliDateTime(selectedSlot.created_at)}
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
      {modalType === 'delete' && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">تأیید حذف</h2>
            </div>

            <div className="p-4">
              <p className="text-slate-300 mb-6">
                آیا از حذف زمان‌بندی «<span dir="ltr">{gregorianToJalali(selectedSlot.date)}</span> — {selectedSlot.start_time} تا {selectedSlot.end_time}» اطمینان دارید؟
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteTimeSlot}
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