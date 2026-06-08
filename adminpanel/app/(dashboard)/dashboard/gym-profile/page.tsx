'use client';

import { useEffect, useState, useTransition } from 'react';
import { Edit2, X, Save, Wrench } from 'lucide-react';
import { getOwnGyms, updateOwnGym, getGymEquipment, updateGymEquipment } from '@/app/actions/gyms';
import { getEquipmentTypes } from '@/app/actions/exercises';
import { getCountries, type Country } from '@/app/actions/config';
import type { Gym, EquipmentType } from '@/app/actions/types';

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
  is_active: boolean;
}

export default function GymProfilePage() {
  const [isPending, startTransition] = useTransition();

  const [gym, setGym] = useState<Gym | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<GymFormData | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<GymFormData>>({});

  // Equipment
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [allEquipmentTypes, setAllEquipmentTypes] = useState<EquipmentType[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  useEffect(() => {
    loadGym();
    loadCountries();
  }, []);

  const loadGym = () => {
    startTransition(async () => {
      setLoading(true);
      setError(null);

      const result = await getOwnGyms();

      if (result.success && result.data) {
        if (result.data.length > 0) {
          const gymData = result.data[0];
          setGym(gymData);

          // Load equipment data
          const [equipResult, typesResult] = await Promise.all([
            getGymEquipment(gymData.id),
            getEquipmentTypes(),
          ]);

          if (equipResult.success && equipResult.data) {
            setEquipment(equipResult.data);
            setSelectedEquipmentIds(equipResult.data.map(et => et.id));
          }

          if (typesResult.success && typesResult.data) {
            setAllEquipmentTypes(typesResult.data);
          }
        } else {
          setError('باشگاهی برای این حساب یافت نشد');
        }
      } else {
        setError(result.error || 'خطا در بارگذاری پروفایل باشگاه');
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

  const startEditing = () => {
    if (!gym) return;
    setIsEditing(true);
    setFormErrors({});
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
      is_active: gym.is_active ?? true,
    });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    const errors: Partial<GymFormData> = {};

    if (!formData.name.trim()) errors.name = 'نام الزامی است';
    if (!formData.address.trim()) errors.address = 'آدرس الزامی است';
    if (!formData.city.trim()) errors.city = 'شهر الزامی است';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gym || !formData || !validateForm()) return;

    startTransition(async () => {
      const result = await updateOwnGym(gym.id, {
        name: formData.name,
        description: formData.description || null,
        address: formData.address,
        city: formData.city,
        area: formData.area || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        price_per_session: parseFloat(formData.price_per_session) || 0,
        phone: formData.phone || null,
        instagram: formData.instagram || null,
        website: formData.website || null,
        open_time: formData.open_time,
        close_time: formData.close_time,
        is_active: formData.is_active,
      });

      if (result.success) {
        setSuccessMessage('پروفایل باشگاه با موفقیت ویرایش شد');
        setIsEditing(false);
        loadGym();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در ویرایش پروفایل باشگاه');
      }
    });
  };

  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    return country?.name || countryId;
  };

  const inputClass = (hasError?: string) =>
    `w-full px-4 py-2.5 bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
        <div className="text-center py-12 text-slate-400">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!gym && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">پروفایل باشگاه</h1>
        </div>
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Page Title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">پروفایل باشگاه</h1>
          <p className="text-slate-400">مشاهده و ویرایش اطلاعات باشگاه شما</p>
        </div>
        {!isEditing && gym && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            <Edit2 className="w-5 h-5" />
            <span>ویرایش</span>
          </button>
        )}
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

      {gym && !isEditing && (
        /* View Mode */
        <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">اطلاعات پایه</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">نام باشگاه</label>
                  <p className="text-white text-lg font-medium">{gym.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">وضعیت</label>
                  <span className={`inline-block px-3 py-1 rounded text-sm ${gym.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {gym.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                {gym.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">توضیحات</label>
                    <p className="text-white">{gym.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">موقعیت</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">آدرس</label>
                  <p className="text-white">{gym.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">شهر</label>
                  <p className="text-white">{gym.city}</p>
                </div>
                {gym.area && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">منطقه</label>
                    <p className="text-white">{gym.area}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">کشور</label>
                  <p className="text-white">{getCountryName(gym.country_id)}</p>
                </div>
                {gym.latitude && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">عرض جغرافیایی</label>
                    <p className="text-white">{gym.latitude}</p>
                  </div>
                )}
                {gym.longitude && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">طول جغرافیایی</label>
                    <p className="text-white">{gym.longitude}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact & Business */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">اطلاعات تماس و کسب‌وکار</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">قیمت هر جلسه</label>
                  <p className="text-white">{gym.price_per_session} تومان</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ساعت کار</label>
                  <p className="text-white">{gym.open_time} — {gym.close_time}</p>
                </div>
                {gym.phone && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">تلفن</label>
                    <p className="text-white">{gym.phone}</p>
                  </div>
                )}
                {gym.instagram && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">اینستاگرام</label>
                    <p className="text-white">{gym.instagram}</p>
                  </div>
                )}
                {gym.website && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">وب‌سایت</label>
                    <a href={gym.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      {gym.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">آمار</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">امتیاز</label>
                  <p className="text-white">{gym.avg_rating > 0 ? `${gym.avg_rating} (${gym.review_count} نظر)` : 'بدون نظر'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">تاریخ ایجاد</label>
                  <p className="text-white">{new Date(gym.created_at).toLocaleDateString('fa-IR')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">آخرین ویرایش</label>
                  <p className="text-white">{new Date(gym.updated_at).toLocaleDateString('fa-IR')}</p>
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">تجهیزات</h2>
              {equipment.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {equipment.map(eq => (
                    <span key={eq.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
                      <Wrench className="w-3.5 h-3.5" />
                      {eq.name_en}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">تجهیزات ثبت نشده</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && formData && (
        /* Edit Mode */
        <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-xl font-bold">ویرایش پروفایل باشگاه</h2>
            <button
              onClick={cancelEditing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">نام باشگاه *</label>
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

            {/* Equipment Selection */}
            <div>
              <label className="block text-sm font-medium mb-1.5">تجهیزات باشگاه</label>
              {allEquipmentTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {allEquipmentTypes.map(eqType => {
                    const isSelected = selectedEquipmentIds.includes(eqType.id);
                    return (
                      <button
                        key={eqType.id}
                        type="button"
                        onClick={() => {
                          setSelectedEquipmentIds(prev =>
                            isSelected ? prev.filter(id => id !== eqType.id) : [...prev, eqType.id]
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
                        {isSelected && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">در حال بارگذاری...</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!gym) return;
                    startTransition(async () => {
                      const result = await updateGymEquipment(gym.id, selectedEquipmentIds);
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
                <span className="text-slate-400 text-sm">{selectedEquipmentIds.length} تجهیزات انتخاب شده</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                {isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}