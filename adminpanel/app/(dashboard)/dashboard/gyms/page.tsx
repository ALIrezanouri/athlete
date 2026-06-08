'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, X, Image, Tag, Dumbbell, Wrench } from 'lucide-react';
import { getAllGyms, createGym, updateGym, deleteGym, getGymPhotos, addGymPhoto, deleteGymPhoto, getGymAmenities, addGymAmenity, deleteGymAmenity, getGymSportTypes, addGymSportType, deleteGymSportType, getGymEquipment, updateGymEquipment } from '@/app/actions/gyms';
import { getEquipmentTypes } from '@/app/actions/exercises';
import { getCountries, type Country } from '@/app/actions/config';
import type { Gym, CreateGymInput, GymPhoto, GymAmenity, GymSportType, EquipmentType } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface GymFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  area: string;
  latitude: string;
  longitude: string;
  price_per_session: string;
  phone: string;
  instagram: string;
  website: string;
  open_time: string;
  close_time: string;
  country_id: string;
  is_active: boolean;
}

const EMPTY_FORM: GymFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  area: '',
  latitude: '',
  longitude: '',
  price_per_session: '0',
  phone: '',
  instagram: '',
  website: '',
  open_time: '08:00',
  close_time: '22:00',
  country_id: '',
  is_active: true,
};

/** Convert string-based form data to proper types for server actions */
function formDataToCreateInput(fd: GymFormData): CreateGymInput {
  return {
    name: fd.name,
    description: fd.description || null,
    address: fd.address,
    city: fd.city,
    area: fd.area || null,
    latitude: fd.latitude ? parseFloat(fd.latitude) : null,
    longitude: fd.longitude ? parseFloat(fd.longitude) : null,
    price_per_session: parseFloat(fd.price_per_session) || 0,
    phone: fd.phone || null,
    instagram: fd.instagram || null,
    website: fd.website || null,
    open_time: fd.open_time,
    close_time: fd.close_time,
    country_id: fd.country_id,
    is_active: fd.is_active,
  };
}

export default function GymsPage() {
  const [isPending, startTransition] = useTransition();
  
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGyms, setTotalGyms] = useState(0);
  const itemsPerPage = 10;
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [formData, setFormData] = useState<GymFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<GymFormData>>({});

  // Detail view state
  const [detailTab, setDetailTab] = useState<'info' | 'photos' | 'amenities' | 'sport_types' | 'equipment'>('info');
  const [photos, setPhotos] = useState<GymPhoto[]>([]);
  const [amenities, setAmenities] = useState<GymAmenity[]>([]);
  const [sportTypes, setSportTypes] = useState<GymSportType[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [allEquipmentTypes, setAllEquipmentTypes] = useState<EquipmentType[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newAmenityKey, setNewAmenityKey] = useState('');
  const [newAmenityValue, setNewAmenityValue] = useState('');
  const [newSportType, setNewSportType] = useState('');

  useEffect(() => {
    loadGyms();
    loadCountries();
  }, [currentPage, searchQuery]);

  const loadGyms = () => {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      
      const result = await getAllGyms({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchQuery || undefined
      });
      
      if (result.success && result.data) {
        setGyms(result.data.data);
        setTotalGyms(result.data.total);
      } else {
        setError(result.error || 'خطا در بارگذاری باشگاه‌ها');
      }
      
      setLoading(false);
    });
  };

  const loadCountries = () => {
    startTransition(async () => {
      const result = await getCountries();
      
      if (result.success && result.data) {
        setCountries(result.data);
      }
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const openModal = (type: ModalType, gym?: Gym) => {
    setModalType(type);
    setFormErrors({});
    setDetailTab('info');
    
    if (gym) {
      setSelectedGym(gym);
      if (type === 'view') {
        loadGymDetail(gym.id);
      }
      if (type === 'edit') {
        setFormData({
          name: gym.name,
          description: gym.description || '',
          address: gym.address || '',
          city: gym.city || '',
          area: gym.area || '',
          latitude: gym.latitude?.toString() || '',
          longitude: gym.longitude?.toString() || '',
          price_per_session: gym.price_per_session?.toString() || '0',
          phone: gym.phone || '',
          instagram: gym.instagram || '',
          website: gym.website || '',
          open_time: gym.open_time || '08:00',
          close_time: gym.close_time || '22:00',
          country_id: gym.country_id,
          is_active: gym.is_active ?? true,
        });
      }
    } else if (type === 'create') {
      setSelectedGym(null);
      setFormData(EMPTY_FORM);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedGym(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setPhotos([]);
    setAmenities([]);
    setSportTypes([]);
    setEquipment([]);
    setAllEquipmentTypes([]);
    setSelectedEquipmentIds([]);
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setNewAmenityKey('');
    setNewAmenityValue('');
    setNewSportType('');
  };

  const loadGymDetail = (gymId: string) => {
    startTransition(async () => {
      const [photosRes, amenitiesRes, sportTypesRes, equipmentRes, allEquipRes] = await Promise.all([
        getGymPhotos(gymId),
        getGymAmenities(gymId),
        getGymSportTypes(gymId),
        getGymEquipment(gymId),
        getEquipmentTypes(),
      ]);
      if (photosRes.success && photosRes.data) setPhotos(photosRes.data);
      if (amenitiesRes.success && amenitiesRes.data) setAmenities(amenitiesRes.data);
      if (sportTypesRes.success && sportTypesRes.data) setSportTypes(sportTypesRes.data);
      if (equipmentRes.success && equipmentRes.data) {
        setEquipment(equipmentRes.data);
        setSelectedEquipmentIds(equipmentRes.data.map(e => e.id));
      }
      if (allEquipRes.success && allEquipRes.data) setAllEquipmentTypes(allEquipRes.data);
    });
  };

  const handleAddPhoto = async () => {
    if (!selectedGym || !newPhotoUrl.trim()) return;
    startTransition(async () => {
      const result = await addGymPhoto(selectedGym.id, newPhotoUrl, newPhotoCaption || undefined);
      if (result.success && result.data) {
        setPhotos(prev => [...prev, result.data!]);
        setNewPhotoUrl('');
        setNewPhotoCaption('');
      } else {
        setError(result.error || 'خطا در افزودن تصویر');
      }
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    startTransition(async () => {
      const result = await deleteGymPhoto(photoId);
      if (result.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        setError(result.error || 'خطا در حذف تصویر');
      }
    });
  };

  const handleAddAmenity = async () => {
    if (!selectedGym || !newAmenityKey.trim()) return;
    startTransition(async () => {
      const result = await addGymAmenity(selectedGym.id, newAmenityKey, newAmenityValue || undefined);
      if (result.success && result.data) {
        setAmenities(prev => [...prev, result.data!]);
        setNewAmenityKey('');
        setNewAmenityValue('');
      } else {
        setError(result.error || 'خطا در افزودن امکان');
      }
    });
  };

  const handleDeleteAmenity = async (amenityId: string) => {
    startTransition(async () => {
      const result = await deleteGymAmenity(amenityId);
      if (result.success) {
        setAmenities(prev => prev.filter(a => a.id !== amenityId));
      } else {
        setError(result.error || 'خطا در حذف امکان');
      }
    });
  };

  const handleAddSportType = async () => {
    if (!selectedGym || !newSportType.trim()) return;
    startTransition(async () => {
      const result = await addGymSportType(selectedGym.id, newSportType);
      if (result.success && result.data) {
        setSportTypes(prev => [...prev, result.data!]);
        setNewSportType('');
      } else {
        setError(result.error || 'خطا در افزودن نوع ورزش');
      }
    });
  };

  const handleDeleteSportType = async (sportTypeId: string) => {
    startTransition(async () => {
      const result = await deleteGymSportType(sportTypeId);
      if (result.success) {
        setSportTypes(prev => prev.filter(s => s.id !== sportTypeId));
      } else {
        setError(result.error || 'خطا در حذف نوع ورزش');
      }
    });
  };

  const validateForm = (): boolean => {
    const errors: Partial<GymFormData> = {};
    
    if (!formData.name.trim()) errors.name = 'نام الزامی است';
    if (!formData.address.trim()) errors.address = 'آدرس الزامی است';
    if (!formData.city.trim()) errors.city = 'شهر الزامی است';
    if (!formData.country_id) errors.country_id = 'کشور الزامی است';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    startTransition(async () => {
      const result = await createGym(formDataToCreateInput(formData));
      
      if (result.success) {
        setSuccessMessage('باشگاه با موفقیت ایجاد شد');
        closeModal();
        loadGyms();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ایجاد باشگاه');
      }
    });
  };

  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGym || !validateForm()) return;
    
    startTransition(async () => {
      const result = await updateGym(selectedGym.id, formDataToCreateInput(formData));
      
      if (result.success) {
        setSuccessMessage('باشگاه با موفقیت ویرایش شد');
        closeModal();
        loadGyms();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ویرایش باشگاه');
      }
    });
  };

  const handleDeleteGym = async () => {
    if (!selectedGym) return;
    
    startTransition(async () => {
      const result = await deleteGym(selectedGym.id);
      
      if (result.success) {
        setSuccessMessage('باشگاه با موفقیت حذف شد');
        closeModal();
        loadGyms();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در حذف باشگاه');
      }
    });
  };

  const totalPages = Math.ceil(totalGyms / itemsPerPage);

  const inputClass = (hasError?: string) =>
    `w-full px-4 py-2.5 bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">مدیریت باشگاه‌ها</h1>
        <p className="text-slate-400">مدیریت و مشاهده تمام باشگاه‌های سیستم</p>
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
            placeholder="جستجوی باشگاه..."
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
          <span>افزودن باشگاه</span>
        </button>
      </div>

      {/* Gyms Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">نام</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden md:table-cell">شهر</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">آدرس</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">تلفن</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-300 hidden lg:table-cell">فعال</th>
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
              ) : gyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    باشگاهی یافت نشد
                  </td>
                </tr>
              ) : (
                gyms.map((gym) => (
                  <tr key={gym.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{gym.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">
                      {gym.city}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                      {gym.address}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                      {gym.phone}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${gym.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {gym.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', gym)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => openModal('edit', gym)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-yellow-400" />
                        </button>
                        <button
                          onClick={() => openModal('delete', gym)}
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
                {modalType === 'create' ? 'افزودن باشگاه جدید' : 'ویرایش باشگاه'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={modalType === 'create' ? handleCreateGym : handleUpdateGym} className="p-4 space-y-4">
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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={inputClass(formErrors.description) + ' resize-none'}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1.5">آدرس *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className={inputClass(formErrors.address) + ' resize-none'}
                />
                {formErrors.address && <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>}
              </div>

              {/* City + Area */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">شهر *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={inputClass(formErrors.city)}
                  />
                  {formErrors.city && <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">منطقه</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className={inputClass()}
                  />
                </div>
              </div>

              {/* Latitude + Longitude */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">عرض جغرافیایی</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className={inputClass()}
                    placeholder="35.6892"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">طول جغرافیایی</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className={inputClass()}
                    placeholder="51.3890"
                  />
                </div>
              </div>

              {/* Price per session */}
              <div>
                <label className="block text-sm font-medium mb-1.5">قیمت هر جلسه (تومان)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.price_per_session}
                  onChange={(e) => setFormData({ ...formData, price_per_session: e.target.value })}
                  className={inputClass()}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1.5">تلفن</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass()}
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm font-medium mb-1.5">اینستاگرام</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className={inputClass()}
                  placeholder="@gym_name"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium mb-1.5">وب‌سایت</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={inputClass()}
                />
              </div>

              {/* Open time + Close time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">ساعت افتتاح</label>
                  <input
                    type="time"
                    value={formData.open_time}
                    onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">ساعت بسته شدن</label>
                  <input
                    type="time"
                    value={formData.close_time}
                    onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                    className={inputClass()}
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium mb-1.5">کشور *</label>
<MobileDrawerSelect
                  value={formData.country_id}
                  onChange={(v) => setFormData({ ...formData, country_id: v })}
                  placeholder="انتخاب کشور"
                  options={[{ value: '', label: 'انتخاب کشور' }, ...countries.map((country: any) => ({ value: country.id, label: country.name }))]}
                  dir="rtl"
                  error={!!formErrors.country_id}
                />
                {formErrors.country_id && <p className="text-red-400 text-sm mt-1">{formErrors.country_id}</p>}
              </div>

              {/* Is Active toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium">باشگاه فعال است</span>
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

      {/* View Modal — Tabbed Detail */}
      {modalType === 'view' && selectedGym && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">مشاهده باشگاه</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-white/10 bg-white/5">
              {([
                { key: 'info', label: 'اطلاعات', icon: Eye },
                { key: 'photos', label: 'تصاویر', icon: Image },
                { key: 'amenities', label: 'امکانات', icon: Tag },
                { key: 'sport_types', label: 'نوع ورزش', icon: Dumbbell },
                { key: 'equipment', label: 'تجهیزات', icon: Wrench },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${detailTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Info Tab */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">نام</label>
                    <p className="text-white">{selectedGym.name}</p>
                  </div>

                  {selectedGym.description && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">توضیحات</label>
                      <p className="text-white">{selectedGym.description}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">آدرس</label>
                    <p className="text-white">{selectedGym.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">شهر</label>
                      <p className="text-white">{selectedGym.city}</p>
                    </div>
                    {selectedGym.area && (
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">منطقه</label>
                        <p className="text-white">{selectedGym.area}</p>
                      </div>
                    )}
                  </div>

                  {selectedGym.phone && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">تلفن</label>
                      <p className="text-white">{selectedGym.phone}</p>
                    </div>
                  )}

                  {selectedGym.instagram && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">اینستاگرام</label>
                      <p className="text-white">{selectedGym.instagram}</p>
                    </div>
                  )}

                  {selectedGym.website && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">وب‌سایت</label>
                      <a href={selectedGym.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        {selectedGym.website}
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">قیمت هر جلسه</label>
                    <p className="text-white">{selectedGym.price_per_session} تومان</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">ساعت کار</label>
                    <p className="text-white">{selectedGym.open_time} — {selectedGym.close_time}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">وضعیت</label>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${selectedGym.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {selectedGym.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  {selectedGym.avg_rating > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">امتیاز</label>
                      <p className="text-white">{selectedGym.avg_rating} ({selectedGym.review_count} نظر)</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ ایجاد</label>
                    <p className="text-white">{new Date(selectedGym.created_at).toLocaleDateString('fa-IR')}</p>
                  </div>
                </div>
              )}

              {/* Photos Tab */}
              {detailTab === 'photos' && (
                <div className="space-y-4">
                  {/* Add photo form */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-400 mb-1">URL تصویر</label>
                      <input
                        type="url"
                        value={newPhotoUrl}
                        onChange={e => setNewPhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-400 mb-1">عنوان</label>
                      <input
                        type="text"
                        value={newPhotoCaption}
                        onChange={e => setNewPhotoCaption(e.target.value)}
                        placeholder="عنوان تصویر"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <button
                      onClick={handleAddPhoto}
                      disabled={isPending || !newPhotoUrl.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors text-sm font-medium"
                    >
                      افزودن
                    </button>
                  </div>

                  {/* Photos list */}
                  {photos.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">تصویری ثبت نشده</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map(photo => (
                        <div key={photo.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3">
                          <div className="w-16 h-16 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{photo.caption || 'بدون عنوان'}</p>
                            <p className="text-slate-500 text-xs truncate">{photo.url}</p>
                            {photo.is_primary && <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 mt-1">اصلی</span>}
                          </div>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={isPending}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amenities Tab */}
              {detailTab === 'amenities' && (
                <div className="space-y-4">
                  {/* Add amenity form */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-400 mb-1">نام امکان</label>
                      <input
                        type="text"
                        value={newAmenityKey}
                        onChange={e => setNewAmenityKey(e.target.value)}
                        placeholder="e.g. parking, shower"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-400 mb-1">مقدار</label>
                      <input
                        type="text"
                        value={newAmenityValue}
                        onChange={e => setNewAmenityValue(e.target.value)}
                        placeholder="e.g. yes, 10"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <button
                      onClick={handleAddAmenity}
                      disabled={isPending || !newAmenityKey.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors text-sm font-medium"
                    >
                      افزودن
                    </button>
                  </div>

                  {/* Amenities list */}
                  {amenities.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">امکانی ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {amenities.map(amenity => (
                        <div key={amenity.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <Tag className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium text-sm">{amenity.amenity_key}</span>
                          {amenity.value && <span className="text-slate-400 text-sm">: {amenity.value}</span>}
                          <button
                            onClick={() => handleDeleteAmenity(amenity.id)}
                            disabled={isPending}
                            className="ml-auto p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sport Types Tab */}
              {detailTab === 'sport_types' && (
                <div className="space-y-4">
                  {/* Add sport type form */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-400 mb-1">نوع ورزش</label>
                      <input
                        type="text"
                        value={newSportType}
                        onChange={e => setNewSportType(e.target.value)}
                        placeholder="e.g. weightlifting, swimming"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <button
                      onClick={handleAddSportType}
                      disabled={isPending || !newSportType.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors text-sm font-medium"
                    >
                      افزودن
                    </button>
                  </div>

                  {/* Sport types list */}
                  {sportTypes.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">نوع ورزشی ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {sportTypes.map(st => (
                        <div key={st.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <Dumbbell className="w-4 h-4 text-green-400" />
                          <span className="text-white font-medium text-sm">{st.sport_type}</span>
                          <button
                            onClick={() => handleDeleteSportType(st.id)}
                            disabled={isPending}
                            className="ml-auto p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Equipment Tab */}
              {detailTab === 'equipment' && (
                <div className="space-y-4">
                  {allEquipmentTypes.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">در حال بارگذاری...</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {allEquipmentTypes.map(eqType => {
                          const isSelected = selectedEquipmentIds.includes(eqType.id);
                          return (
                            <button
                              key={eqType.id}
                              onClick={() => {
                                setSelectedEquipmentIds(prev =>
                                  isSelected
                                    ? prev.filter(id => id !== eqType.id)
                                    : [...prev, eqType.id]
                                );
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              <Wrench className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                              <span>{eqType.name_en}</span>
                              {isSelected && (
                                <span className="ml-auto text-blue-400 text-xs">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            if (!selectedGym) return;
                            startTransition(async () => {
                              const result = await updateGymEquipment(selectedGym.id, selectedEquipmentIds);
                              if (result.success) {
                                const updatedEquipment = allEquipmentTypes.filter(et => selectedEquipmentIds.includes(et.id));
                                setEquipment(updatedEquipment);
                                setSuccessMessage('تجهیزات باشگاه با موفقیت ذخیره شد');
                                setTimeout(() => setSuccessMessage(null), 3000);
                              } else {
                                setError(result.error || 'خطا در ذخیره تجهیزات');
                              }
                            });
                          }}
                          disabled={isPending}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors font-medium"
                        >
                          {isPending ? 'در حال ذخیره...' : 'ذخیره تجهیزات'}
                        </button>
                        <span className="text-slate-400 text-sm">
                          {selectedEquipmentIds.length} تجهیزات انتخاب شده
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

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
      {modalType === 'delete' && selectedGym && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">تأیید حذف</h2>
            </div>

            <div className="p-4">
              <p className="text-slate-300 mb-6">
                آیا از حذف باشگاه «{selectedGym.name}» اطمینان دارید؟
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteGym}
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