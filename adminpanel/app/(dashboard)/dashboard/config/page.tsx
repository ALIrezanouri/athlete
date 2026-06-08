// System Configuration Page - Admin Only
'use client';

import { useState, useEffect, useTransition } from 'react';
import { getSystemConfig, updateSystemConfig, getAllFeatureFlags, updateFeatureFlag } from '@/app/actions/config';
import type { SystemConfig, FeatureFlag } from '@/app/actions/types';

interface ConfigFormData {
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  maintenance_mode: boolean;
  enable_registration: boolean;
  enable_booking_system: boolean;
  enable_wallet_system: boolean;
  enable_reviews: boolean;
  enable_notifications: boolean;
}

// Persian labels for feature keys
const FEATURE_KEY_LABELS: Record<string, string> = {
  wallet: 'کیف پول',
  booking: 'رزرو',
  reviews: 'نظرات و امتیاز',
  social: 'شبکه اجتماعی',
  body_stats: 'آمار بدنی',
  routines: 'برنامه‌های تمرین',
  custom_exercises: 'تمرینات سفارشی',
  workout_sharing: 'اشتراک‌گذاری تمرین',
};

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigFormData>({
    site_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    maintenance_mode: false,
    enable_registration: true,
    enable_booking_system: true,
    enable_wallet_system: true,
    enable_reviews: true,
    enable_notifications: true,
  });

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSystemConfig();
      
      if (result.success && result.data) {
        // Parse the config data from JSON string
        let parsedValue: any = {};
        try {
          if (result.data.value) {
            parsedValue = JSON.parse(result.data.value);
          }
        } catch (e) {
          console.error('Error parsing config value:', e);
        }

        const configData: ConfigFormData = {
          site_name: parsedValue.site_name || '',
          site_description: parsedValue.site_description || '',
          contact_email: parsedValue.contact_email || '',
          contact_phone: parsedValue.contact_phone || '',
          maintenance_mode: parsedValue.maintenance_mode || false,
          enable_registration: parsedValue.enable_registration ?? true,
          enable_booking_system: parsedValue.enable_booking_system ?? true,
          enable_wallet_system: parsedValue.enable_wallet_system ?? true,
          enable_reviews: parsedValue.enable_reviews ?? true,
          enable_notifications: parsedValue.enable_notifications ?? true,
        };
        setConfig(configData);
      } else {
        setError(result.error || 'خطا در دریافت تنظیمات');
      }
    } catch (err) {
      setError('خطا در دریافت تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatureFlags = async () => {
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const result = await getAllFeatureFlags();
      if (result.success && result.data) {
        setFeatureFlags(result.data);
      } else {
        setFlagsError(result.error || 'خطا در دریافت ویژگی‌ها');
      }
    } catch {
      setFlagsError('خطا در دریافت ویژگی‌ها');
    } finally {
      setFlagsLoading(false);
    }
  };

  const handleToggleFeatureFlag = (featureKey: string, currentEnabled: boolean) => {
    startTransition(async () => {
      const result = await updateFeatureFlag(featureKey, !currentEnabled);
      if (result.success) {
        setFeatureFlags(prev =>
          prev.map(f => f.feature_key === featureKey ? { ...f, is_enabled: !currentEnabled } : f)
        );
        setSuccess(`ویژگی "${FEATURE_KEY_LABELS[featureKey] || featureKey}" ${!currentEnabled ? 'فعال' : 'غیرفعال'} شد`);
      } else {
        setError(result.error || 'خطا در تغییر ویژگی');
      }
    });
  };

  useEffect(() => {
    fetchConfig();
    fetchFeatureFlags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form data
      if (!config.site_name.trim()) {
        setError('نام سایت الزامی است');
        setSaving(false);
        return;
      }

      if (!config.contact_email.trim()) {
        setError('ایمیل تماس الزامی است');
        setSaving(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.contact_email)) {
        setError('فرمت ایمیل نامعتبر است');
        setSaving(false);
        return;
      }

      if (!config.contact_phone.trim()) {
        setError('تلفن تماس الزامی است');
        setSaving(false);
        return;
      }

      // Update config
      const result = await updateSystemConfig({
        value: JSON.stringify(config),
      });

      if (result.success) {
        setSuccess('تنظیمات با موفقیت ذخیره شد');
      } else {
        setError(result.error || 'خطا در ذخیره تنظیمات');
      }
    } catch (err) {
      setError('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">تنظیمات سیستم</h1>
          <p className="text-gray-600">مدیریت تنظیمات و قابلیت‌های سیستم</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* App Settings Section */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
              تنظیمات برنامه
            </h2>

            <div className="space-y-4">
              {/* Site Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام سایت
                </label>
                <input
                  type="text"
                  value={config.site_name}
                  onChange={(e) => setConfig({ ...config, site_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                  placeholder="نام سایت را وارد کنید"
                />
              </div>

              {/* Site Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  توضیحات سایت
                </label>
                <textarea
                  value={config.site_description}
                  onChange={(e) => setConfig({ ...config, site_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm resize-none"
                  placeholder="توضیحات سایت را وارد کنید"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ایمیل تماس
                </label>
                <input
                  type="email"
                  value={config.contact_email}
                  onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                  placeholder="ایمیل تماس را وارد کنید"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تلفن تماس
                </label>
                <input
                  type="tel"
                  value={config.contact_phone}
                  onChange={(e) => setConfig({ ...config, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                  placeholder="تلفن تماس را وارد کنید"
                />
              </div>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    حالت تعمیر
                  </label>
                  <p className="text-xs text-gray-500">
                    در حالت تعمیر، دسترسی کاربران محدود می‌شود
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenance_mode}
                    onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Feature Flags Section */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
              قابلیت‌های سیستم
            </h2>

            <div className="space-y-4">
              {/* Enable Registration */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ثبت‌نام کاربران
                  </label>
                  <p className="text-xs text-gray-500">
                    امکان ثبت‌نام کاربران جدید در سیستم
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_registration}
                    onChange={(e) => setConfig({ ...config, enable_registration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Enable Booking System */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سیستم رزرو
                  </label>
                  <p className="text-xs text-gray-500">
                    امکان رزرو سالن‌های ورزشی
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_booking_system}
                    onChange={(e) => setConfig({ ...config, enable_booking_system: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Enable Wallet System */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سیستم کیف پول
                  </label>
                  <p className="text-xs text-gray-500">
                    امکان استفاده از کیف پول برای پرداخت‌ها
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_wallet_system}
                    onChange={(e) => setConfig({ ...config, enable_wallet_system: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Enable Reviews */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نظرات و امتیاز
                  </label>
                  <p className="text-xs text-gray-500">
                    امکان ثبت نظر و امتیاز برای سالن‌ها
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_reviews}
                    onChange={(e) => setConfig({ ...config, enable_reviews: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Enable Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اعلان‌ها
                  </label>
                  <p className="text-xs text-gray-500">
                    ارسال اعلان‌ها به کاربران
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_notifications}
                    onChange={(e) => setConfig({ ...config, enable_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Feature Flags (Database) Section */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b border-gray-200">
              ویژگی‌های سیستم (پایگاه داده)
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              این ویژگی‌ها از جدول feature_flags خوانده می‌شوند — تغییرات مستقیماً روی اپلیکیشن ورزشکاران اعمال می‌شود
            </p>

            {flagsLoading ? (
              <div className="flex justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : flagsError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {flagsError}
              </div>
            ) : featureFlags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                هیچ ویژگی یافت نشد
              </div>
            ) : (
              <div className="space-y-4">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between p-4 bg-gray-50/50 backdrop-blur-sm rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {FEATURE_KEY_LABELS[flag.feature_key] || flag.feature_key}
                      </label>
                      {flag.description && (
                        <p className="text-xs text-gray-500">{flag.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        کلید: <span className="font-mono">{flag.feature_key}</span>
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.is_enabled}
                        onChange={() => handleToggleFeatureFlag(flag.feature_key, flag.is_enabled)}
                        disabled={isPending}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}