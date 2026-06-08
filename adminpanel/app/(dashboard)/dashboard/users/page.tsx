// User Management Page - Admin Only
'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAllUsers, updateUserRole, getAthleteProfile } from '@/app/actions/users';
import type { Profile, UserRole, AthleteProfile } from '@/app/actions/types';
import RoleBadge from '@/components/admin/role-badge';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('athlete');
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllUsers({
        page,
        pageSize: 20,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      
      if (result.success && result.data) {
        setUsers(result.data.data);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'خطا در دریافت کاربران');
      }
    } catch (err) {
      setError('خطا در دریافت کاربران');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const result = await updateUserRole(userId, role);
    if (result.success) {
      setEditingRole(false);
      setSelectedUser(null);
      fetchUsers();
    } else {
      alert(result.error || 'خطا در تغییر نقش');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+98')) {
      return `0${phone.slice(3)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('fa-IR').format(balance);
  };

  if (loading && users.length === 0) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مدیریت کاربران</h1>
          <p className="text-gray-600">مدیریت کاربران سیستم</p>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                جستجو
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="نام یا شماره موبایل..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نقش
              </label>
              <MobileDrawerSelect
                value={roleFilter}
                onChange={(v) => { setRoleFilter(v as UserRole | ''); setPage(1); }}
                placeholder="همه نقش‌ها"
                options={[
                  { value: '', label: 'همه نقش‌ها' },
                  { value: 'athlete', label: 'ورزشکار' },
                  { value: 'gym_manager', label: 'مدیر سالن' },
                  { value: 'coach', label: 'مربی' },
                  { value: 'doctor', label: 'پزشک' },
                  { value: 'admin', label: 'مدیر سیستم' },
                ]}
                dir="rtl"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                جستجو
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کاربر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نقش
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    موجودی کیف پول
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ عضویت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'بدون نام'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPhoneNumber(user.mobile_number)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatBalance(user.wallet_balance)} تومان
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.deleted_at ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                          حذف شده
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                          فعال
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setEditingRole(false);
                          setAthleteProfile(null);
                          // Load athlete profile if user is an athlete
                          if (user.role === 'athlete') {
                            startTransition(async () => {
                              const result = await getAthleteProfile(user.id);
                              if (result.success) {
                                setAthleteProfile(result.data || null);
                              }
                            });
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        مدیریت
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                صفحه {page} از {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  قبلی
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-800">جزئیات کاربر</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نام
                  </label>
                  <p className="text-gray-900">{selectedUser.full_name || 'بدون نام'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    شماره موبایل
                  </label>
                  <p className="text-gray-900">{formatPhoneNumber(selectedUser.mobile_number)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نقش
                  </label>
                  {editingRole ? (
                    <div className="space-y-2">
                      <MobileDrawerSelect
                        value={newRole}
                        onChange={(v) => setNewRole(v as UserRole)}
                        placeholder="انتخاب نقش"
                        options={[
                          { value: 'athlete', label: 'ورزشکار' },
                          { value: 'gym_manager', label: 'مدیر سالن' },
                          { value: 'coach', label: 'مربی' },
                          { value: 'doctor', label: 'پزشک' },
                          { value: 'admin', label: 'مدیر سیستم' },
                        ]}
                        dir="rtl"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleChange(selectedUser.id, newRole)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          ذخیره
                        </button>
                        <button
                          onClick={() => {
                            setEditingRole(false);
                            setNewRole(selectedUser.role);
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RoleBadge role={selectedUser.role} />
                      <button
                        onClick={() => setEditingRole(true)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        تغییر
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    موجودی کیف پول
                  </label>
                  <p className="text-gray-900">{formatBalance(selectedUser.wallet_balance)} تومان</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تاریخ عضویت
                  </label>
                  <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وضعیت
                  </label>
                  {selectedUser.deleted_at ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                      حذف شده
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      فعال
                    </span>
                  )}
                </div>

                {/* Athlete Profile Section */}
                {selectedUser.role === 'athlete' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">پروفایل ورزشکار</h3>
                    {athleteProfile ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">سطح آمادگی</label>
                          <p className="text-gray-900">
                            {athleteProfile.fitness_level === 'beginner' ? 'مبتدی' :
                             athleteProfile.fitness_level === 'intermediate' ? 'متوسط' :
                             athleteProfile.fitness_level === 'advanced' ? 'پیشرفته' :
                             athleteProfile.fitness_level === 'professional' ? 'حرفه‌ای' : athleteProfile.fitness_level || '—'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">جنسیت</label>
                          <p className="text-gray-900">
                            {athleteProfile.gender === 'male' ? 'مرد' :
                             athleteProfile.gender === 'female' ? 'زن' :
                             athleteProfile.gender === 'other' ? 'سایر' : athleteProfile.gender || '—'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">قد (سانتی‌متر)</label>
                          <p className="text-gray-900">{athleteProfile.height_cm || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">وزن (کیلوگرم)</label>
                          <p className="text-gray-900">{athleteProfile.weight_kg || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تولد</label>
                          <p className="text-gray-900">{athleteProfile.date_of_birth ? formatDate(athleteProfile.date_of_birth) : '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ورزش‌های مورد علاقه</label>
                          <p className="text-gray-900">
                            {athleteProfile.sport_preferences && athleteProfile.sport_preferences.length > 0
                              ? athleteProfile.sport_preferences.join('، ')
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">نام تماس اضطراری</label>
                          <p className="text-gray-900">{athleteProfile.emergency_contact_name || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">شماره تماس اضطراری</label>
                          <p className="text-gray-900">{athleteProfile.emergency_contact_phone || '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">پروفایل ورزشکاری وجود ندارد</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}