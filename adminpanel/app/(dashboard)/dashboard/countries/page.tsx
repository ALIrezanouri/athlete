// Countries Management Page - Admin Only
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Country } from '@/app/actions/types';

type ModalType = 'edit' | null;

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_local: '',
    is_rtl: false,
    is_active: true,
    currency_code: '',
    currency_symbol: '',
    phone_prefix: '',
    currency_decimals: 0,
    currency_display_unit: '',
    currency_unit_divisor: 1,
    currency_locale: '',
  });

  const loadCountries = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const { getAllCountries } = await import('@/app/actions/countries');
      const result = await getAllCountries();
      if (result.success && result.data) {
        setCountries(result.data);
      } else {
        setError(result.error || 'خطا در دریافت کشورها');
      }
    });
    setLoading(false);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  const openEditModal = (country: Country) => {
    setModalType('edit');
    setSelectedCountry(country);
    setError(null);
    setSuccess(null);
    setFormData({
      name_en: country.name_en,
      name_local: country.name_local,
      is_rtl: country.is_rtl,
      is_active: country.is_active,
      currency_code: country.currency_code,
      currency_symbol: country.currency_symbol,
      phone_prefix: country.phone_prefix || '',
      currency_decimals: country.currency_decimals,
      currency_display_unit: country.currency_display_unit || '',
      currency_unit_divisor: country.currency_unit_divisor || 1,
      currency_locale: country.currency_locale,
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedCountry(null);
    setError(null);
    setSuccess(null);
  };

  const handleToggleActive = (country: Country) => {
    startTransition(async () => {
      const { updateCountry } = await import('@/app/actions/countries');
      const result = await updateCountry(country.id, { is_active: !country.is_active });
      if (result.success) {
        setCountries(prev =>
          prev.map(c => c.id === country.id ? { ...c, is_active: !country.is_active } : c)
        );
        setSuccess(`کشور "${country.name_local}" ${!country.is_active ? 'فعال' : 'غیرفعال'} شد`);
      } else {
        setError(result.error || 'خطا در تغییر وضعیت کشور');
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) return;
    startTransition(async () => {
      const { updateCountry } = await import('@/app/actions/countries');
      const result = await updateCountry(selectedCountry.id, {
        name_en: formData.name_en,
        name_local: formData.name_local,
        is_rtl: formData.is_rtl,
        is_active: formData.is_active,
        currency_code: formData.currency_code,
        currency_symbol: formData.currency_symbol,
        phone_prefix: formData.phone_prefix || null,
        currency_decimals: formData.currency_decimals,
        currency_display_unit: formData.currency_display_unit || null,
        currency_unit_divisor: formData.currency_unit_divisor || null,
        currency_locale: formData.currency_locale,
      });
      if (result.success) {
        setSuccess('کشور با موفقیت ویرایش شد');
        closeModal();
        loadCountries();
      } else {
        setError(result.error || 'خطا در ویرایش کشور');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">مدیریت کشورها</h1>
          <p className="text-gray-400">مشاهده و ویرایش تنظیمات کشورها (واحد پول، زبان، RTL)</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">شناسه</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">نام (انگلیسی)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">نام (محلی)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">واحد پول</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">RTL</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">فعال</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading || isPending ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </td>
                </tr>
              ) : countries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    هیچ کشور یافت نشد
                  </td>
                </tr>
              ) : (
                countries.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-mono text-sm">{c.id}</td>
                    <td className="px-4 py-3 text-gray-300">{c.name_en}</td>
                    <td className="px-4 py-3 text-white">{c.name_local}</td>
                    <td className="px-4 py-3 text-gray-300">
                      <span className="font-mono">{c.currency_code}</span> ({c.currency_symbol})
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.is_rtl ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {c.is_rtl ? 'RTL' : 'LTR'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.is_active}
                          onChange={() => handleToggleActive(c)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(c)}
                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                      >
                        ویرایش
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {modalType === 'edit' && selectedCountry && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4">
              <h2 className="text-xl font-bold text-white mb-6">
                ویرایش کشور: {selectedCountry.name_local}
              </h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                {/* ID (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">شناسه</label>
                  <p className="text-white font-mono bg-white/5 px-4 py-2 rounded-lg">{selectedCountry.id}</p>
                </div>

                {/* Name EN */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">نام (انگلیسی)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Name Local */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">نام (محلی)</label>
                  <input
                    type="text"
                    value={formData.name_local}
                    onChange={(e) => setFormData({ ...formData, name_local: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Currency Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">کد واحد پول</label>
                  <input
                    type="text"
                    value={formData.currency_code}
                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">نماد واحد پول</label>
                  <input
                    type="text"
                    value={formData.currency_symbol}
                    onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Phone Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">پیش‌شماره تلفن</label>
                  <input
                    type="text"
                    value={formData.phone_prefix}
                    onChange={(e) => setFormData({ ...formData, phone_prefix: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Currency Decimals */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">تعداد اعشار پول</label>
                  <input
                    type="number"
                    value={formData.currency_decimals}
                    onChange={(e) => setFormData({ ...formData, currency_decimals: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="4"
                  />
                </div>

                {/* Currency Locale */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">محلی‌سازی پول</label>
                  <input
                    type="text"
                    value={formData.currency_locale}
                    onChange={(e) => setFormData({ ...formData, currency_locale: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* RTL toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">RTL (راست به چپ)</label>
                    <p className="text-xs text-gray-500 mt-1">زبان‌های RTL مانند فارسی و عربی</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_rtl}
                      onChange={(e) => setFormData({ ...formData, is_rtl: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">فعال</label>
                    <p className="text-xs text-gray-500 mt-1">کشورهای فعال در اپلیکیشن نمایش داده می‌شوند</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'در حال پردازش...' : 'ذخیره'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}