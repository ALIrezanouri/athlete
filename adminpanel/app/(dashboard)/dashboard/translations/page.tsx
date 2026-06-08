// Translations Management Page - Admin Only
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Translation } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'create' | 'edit' | 'delete' | null;

interface TranslationFormData {
  locale: string;
  key: string;
  value: string;
}

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [localeFilter, setLocaleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [formData, setFormData] = useState<TranslationFormData>({
    locale: 'fa',
    key: '',
    value: '',
  });

  const loadTranslations = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const { getAllTranslations } = await import('@/app/actions/translations');
      const result = await getAllTranslations({
        page,
        pageSize,
        locale: localeFilter || undefined,
        search: searchQuery || undefined,
      });
      if (result.success && result.data) {
        setTranslations(result.data.data);
        setTotal(result.data.total);
      } else {
        setError(result.error || 'خطا در دریافت ترجمه‌ها');
      }
    });
    setLoading(false);
  };

  useEffect(() => {
    loadTranslations();
  }, [page, localeFilter]);

  const handleSearch = () => {
    setPage(1);
    loadTranslations();
  };

  const openModal = (type: ModalType, translation?: Translation) => {
    setModalType(type);
    setError(null);
    setSuccess(null);
    if (translation) {
      setSelectedTranslation(translation);
      setFormData({
        locale: translation.locale,
        key: translation.key,
        value: translation.value,
      });
    } else {
      setSelectedTranslation(null);
      setFormData({ locale: 'fa', key: '', value: '' });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTranslation(null);
    setError(null);
    setSuccess(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { createTranslation } = await import('@/app/actions/translations');
      const result = await createTranslation(formData.locale, formData.key, formData.value);
      if (result.success) {
        setSuccess('ترجمه با موفقیت ایجاد شد');
        closeModal();
        loadTranslations();
      } else {
        setError(result.error || 'خطا در ایجاد ترجمه');
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTranslation) return;
    startTransition(async () => {
      const { updateTranslation } = await import('@/app/actions/translations');
      const result = await updateTranslation(selectedTranslation.id, formData.value);
      if (result.success) {
        setSuccess('ترجمه با موفقیت ویرایش شد');
        closeModal();
        loadTranslations();
      } else {
        setError(result.error || 'خطا در ویرایش ترجمه');
      }
    });
  };

  const handleDelete = async () => {
    if (!selectedTranslation) return;
    startTransition(async () => {
      const { deleteTranslation } = await import('@/app/actions/translations');
      const result = await deleteTranslation(selectedTranslation.id);
      if (result.success) {
        setSuccess('ترجمه با موفقیت حذف شد');
        closeModal();
        loadTranslations();
      } else {
        setError(result.error || 'خطا در حذف ترجمه');
      }
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const LOCALE_LABELS: Record<string, string> = {
    fa: 'فارسی',
    en: 'انگلیسی',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">مدیریت ترجمه‌ها</h1>
          <p className="text-gray-400">مدیریت ترجمه‌های اپلیکیشن (فارسی و انگلیسی)</p>
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

        {/* Filters + Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
<MobileDrawerSelect
            value={localeFilter}
            onChange={setLocaleFilter}
            placeholder="همه زبان‌ها"
            options={[
              { value: '', label: 'همه زبان‌ها' },
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'انگلیسی' },
            ]}
            dir="rtl"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="جستجو در کلید یا مقدار..."
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          />

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            جستجو
          </button>

          <button
            onClick={() => openModal('create')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + ایجاد ترجمه
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">زبان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">کلید</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">مقدار</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">تاریخ ایجاد</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading || isPending ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </td>
                </tr>
              ) : translations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    هیچ ترجمه یافت نشد
                  </td>
                </tr>
              ) : (
                translations.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.locale === 'fa' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        {LOCALE_LABELS[t.locale] || t.locale}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-sm">{t.key}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{t.value}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('edit', t)}
                          className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => openModal('delete', t)}
                          className="text-red-400 hover:text-red-300 transition-colors text-sm"
                        >
                          حذف
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
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              قبلی
            </button>
            <span className="text-gray-400 text-sm">
              صفحه {page} از {totalPages} ({total} ترجمه)
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              بعدی
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {(modalType === 'create' || modalType === 'edit') && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-white mb-6">
                {modalType === 'create' ? 'ایجاد ترجمه جدید' : 'ویرایش ترجمه'}
              </h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={modalType === 'create' ? handleCreate : handleUpdate} className="space-y-4">
                {/* Locale */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">زبان</label>
                  {modalType === 'create' ? (
<MobileDrawerSelect
                      value={formData.locale}
                      onChange={(v) => setFormData({ ...formData, locale: v })}
                      placeholder="انتخاب زبان"
                      options={[
                        { value: 'fa', label: 'فارسی' },
                        { value: 'en', label: 'انگلیسی' },
                      ]}
                      dir="rtl"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                      formData.locale === 'fa' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {LOCALE_LABELS[formData.locale] || formData.locale}
                    </span>
                  )}
                </div>

                {/* Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">کلید</label>
                  {modalType === 'create' ? (
                    <input
                      type="text"
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. common.save"
                      required
                    />
                  ) : (
                    <p className="text-white font-mono bg-white/5 px-4 py-2 rounded-lg">{formData.key}</p>
                  )}
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">مقدار</label>
                  <textarea
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="متن ترجمه..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'در حال پردازش...' : (modalType === 'create' ? 'ایجاد' : 'ذخیره')}
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

        {/* Delete Modal */}
        {modalType === 'delete' && selectedTranslation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-white mb-4">حذف ترجمه</h2>
              <p className="text-gray-400 mb-2">
                آیا مطمئن هستید که می‌خواهید این ترجمه را حذف کنید؟
              </p>
              <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2">
                <p className="text-gray-400 text-sm">
                  زبان: <span className="text-white">{LOCALE_LABELS[selectedTranslation.locale]}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  کلید: <span className="text-white font-mono">{selectedTranslation.key}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  مقدار: <span className="text-white">{selectedTranslation.value}</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'در حال حذف...' : 'حذف'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}