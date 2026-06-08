// Audit Log Page - Admin Only
'use client';

import { useState, useEffect } from 'react';
import { getAuditLogs, getAdminUsers, getAllActionTypes, type AuditLog, type AuditActionType } from '@/app/actions/audit-log';
import type { PaginatedResult } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<PaginatedResult<AuditLog> | null>(null);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [actionTypes, setActionTypes] = useState<Array<{ value: AuditActionType; label: string }>>([]);
  const [actionLabelMap, setActionLabelMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs({
        admin_user_id: selectedAdmin || undefined,
        action_type: selectedActionType as AuditActionType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: currentPage,
        pageSize: 20,
      });

      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'خطا در دریافت اطلاعات');
      }
    } catch (err) {
      setError('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const result = await getAdminUsers();
      if (result.success && result.data) {
        setAdminUsers(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  const fetchActionTypes = async () => {
    try {
      const types = await getAllActionTypes();
      setActionTypes(types);
      const map: Record<string, string> = {};
      types.forEach(t => { map[t.value] = t.label; });
      setActionLabelMap(map);
    } catch (err) {
      console.error('Failed to fetch action types:', err);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchAdminUsers();
    fetchActionTypes();
  }, [currentPage]);

  const handleApplyFilter = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleResetFilter = () => {
    setSelectedAdmin('');
    setSelectedActionType('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  };

  const formatActionDetails = (details: Record<string, any>) => {
    return JSON.stringify(details, null, 2);
  };

  if (loading && !logs) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لاگ عملیات</h1>
          <p className="text-gray-600">تاریخچه تمام عملیات مدیران سیستم</p>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">فیلترها</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Admin User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مدیر
              </label>
<MobileDrawerSelect
                value={selectedAdmin}
                onChange={setSelectedAdmin}
                placeholder="همه مدیران"
                options={[{ value: '', label: 'همه مدیران' }, ...adminUsers.map((admin: any) => ({ value: admin.id, label: admin.name }))]}
                dir="rtl"
              />
            </div>

            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع عملیات
              </label>
<MobileDrawerSelect
                value={selectedActionType}
                onChange={setSelectedActionType}
                placeholder="همه عملیات"
                options={[{ value: '', label: 'همه عملیات' }, ...actionTypes.map((a: any) => ({ value: a.value, label: a.label }))]}
                dir="rtl"
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                از تاریخ
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تا تاریخ
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyFilter}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              اعمال فیلتر
            </button>
            <button
              onClick={handleResetFilter}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              بازنشانی
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
          {logs && logs.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">مدیر</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">نوع عملیات</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">مورد هدف</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">جزئیات</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-800">{log.admin_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {actionLabelMap[log.action_type] || log.action_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-800">
                          {log.target_type}
                          {log.target_id && ` (${log.target_id.slice(0, 8)}...)`}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={formatActionDetails(log.action_details)}>
                          {formatActionDetails(log.action_details)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-800">
                          {formatTimestamp(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logs.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    صفحه {logs.page} از {logs.totalPages} (کل {logs.total} مورد)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(logs.page - 1)}
                      disabled={logs.page === 1}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      قبلی
                    </button>
                    {Array.from({ length: Math.min(5, logs.totalPages) }, (_, i) => {
                      let pageNum;
                      if (logs.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (logs.page <= 3) {
                        pageNum = i + 1;
                      } else if (logs.page >= logs.totalPages - 2) {
                        pageNum = logs.totalPages - 4 + i;
                      } else {
                        pageNum = logs.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            pageNum === logs.page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(logs.page + 1)}
                      disabled={logs.page === logs.totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      بعدی
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">هیچ موردی یافت نشد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}