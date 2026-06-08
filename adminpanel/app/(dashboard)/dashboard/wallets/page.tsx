'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAllWallets, addFunds, deductFunds } from '@/app/actions/wallet';
import type { ActionResult, PaginatedResult } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

interface Wallet {
  id: string;
  full_name: string | null;
  mobile_number: string;
  wallet_balance: number;
  created_at: string;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // Modals
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [addFundsModal, setAddFundsModal] = useState(false);
  const [deductFundsModal, setDeductFundsModal] = useState(false);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllWallets({
        page,
        pageSize: 20,
        search: search || undefined,
      });
      
      if (result.success && result.data) {
        setWallets(result.data.data);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'خطا در دریافت کیف پول‌ها');
      }
    } catch (err) {
      setError('خطا در دریافت کیف پول‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchWallets();
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      setError('مبلغ باید مثبت باشد');
      return;
    }

    startTransition(async () => {
      const result = await addFunds(selectedUserId, amountNum, reason || undefined);
      if (result.success) {
        setSuccessMessage('موجودی با موفقیت اضافه شد');
        setAddFundsModal(false);
        setSelectedUserId('');
        setAmount('');
        setReason('');
        fetchWallets();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در افزودن موجودی');
      }
    });
  };

  const handleDeductFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      setError('مبلغ باید مثبت باشد');
      return;
    }

    startTransition(async () => {
      const result = await deductFunds(selectedUserId, amountNum, reason || undefined);
      if (result.success) {
        setSuccessMessage('موجودی با موفقیت کسر شد');
        setDeductFundsModal(false);
        setSelectedUserId('');
        setAmount('');
        setReason('');
        fetchWallets();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'خطا در کسر موجودی');
      }
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+98')) {
      return `0${phone.slice(3)}`;
    }
    return phone;
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('fa-IR').format(balance);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  if (loading && wallets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-purple-200">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">مدیریت کیف پول‌ها</h1>
          <p className="text-purple-200">مدیریت موجودی کیف پول کاربران</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-lg border border-green-500/30 rounded-xl text-green-200">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-lg border border-red-500/30 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Search and Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                جستجو
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="جستجوی کاربر..."
                className="w-full px-4 py-2 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-purple-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
              >
                جستجو
              </button>
              <button
                onClick={() => {
                  setAddFundsModal(true);
                  setError(null);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
              >
                افزودن موجودی
              </button>
              <button
                onClick={() => {
                  setDeductFundsModal(true);
                  setError(null);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
              >
                کسر موجودی
              </button>
            </div>
          </div>
        </div>

        {/* Wallets Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">
                    کاربر
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">
                    موجودی
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">
                    تاریخ عضویت
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-purple-200">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-purple-200">
                      هیچ کیف پولی یافت نشد
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{wallet.full_name || 'بدون نام'}</div>
                        <div className="text-sm text-purple-200">{formatPhoneNumber(wallet.mobile_number)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{formatBalance(wallet.wallet_balance)} تومان</div>
                      </td>
                      <td className="px-6 py-4 text-white">{formatDate(wallet.created_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedWallet(wallet)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
            <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-purple-200">
                صفحه {page} از {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  قبلی
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Funds Modal */}
        {addFundsModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setAddFundsModal(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 to-purple-900 border border-white/20 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">افزودن موجودی</h2>
                <button
                  onClick={() => setAddFundsModal(false)}
                  className="text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddFunds} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    کاربر
                  </label>
<MobileDrawerSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="انتخاب کاربر"
                    options={[{ value: '', label: 'همه کاربران' }, ...wallets.map((w: any) => ({ value: w.id, label: w.full_name || w.mobile_number }))]}
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    مبلغ
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    step="1"
                    placeholder="مبلغ به تومان"
                    className="w-full px-4 py-2 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-purple-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    دلیل
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="دلیل افزودن موجودی"
                    rows={3}
                    className="w-full px-4 py-2 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-purple-300"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddFundsModal(false)}
                    className="flex-1 px-4 py-2 border border-purple-500/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deduct Funds Modal */}
        {deductFundsModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setDeductFundsModal(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 to-purple-900 border border-white/20 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">کسر موجودی</h2>
                <button
                  onClick={() => setDeductFundsModal(false)}
                  className="text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleDeductFunds} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    کاربر
                  </label>
<MobileDrawerSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="انتخاب کاربر"
                    options={wallets.map((w: any) => ({ value: w.id, label: w.full_name || w.mobile_number }))}
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    مبلغ
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    step="1"
                    placeholder="مبلغ به تومان"
                    className="w-full px-4 py-2 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-purple-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    دلیل
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="دلیل کسر موجودی"
                    rows={3}
                    className="w-full px-4 py-2 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-purple-300"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeductFundsModal(false)}
                    className="flex-1 px-4 py-2 border border-purple-500/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Wallet Details Modal */}
        {selectedWallet && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedWallet(null)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 to-purple-900 border border-white/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">جزئیات کیف پول</h2>
                <button
                  onClick={() => setSelectedWallet(null)}
                  className="text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">اطلاعات کاربر</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-purple-300 mb-1">نام</div>
                      <div className="text-white font-medium">{selectedWallet.full_name || 'بدون نام'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-purple-300 mb-1">شماره موبایل</div>
                      <div className="text-white font-medium">{formatPhoneNumber(selectedWallet.mobile_number)}</div>
                    </div>
                  </div>
                </div>

                {/* Balance Info */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">موجودی کیف پول</h3>
                  <div className="text-3xl font-bold text-white">
                    {formatBalance(selectedWallet.wallet_balance)} تومان
                  </div>
                </div>

                {/* Account Date */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-200 mb-4">تاریخ عضویت</h3>
                  <div className="text-white font-medium">{formatDate(selectedWallet.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}