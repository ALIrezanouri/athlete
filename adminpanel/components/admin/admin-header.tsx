// Admin Header Component
'use client';

import { signOut } from '@/app/actions/auth';

interface AdminHeaderProps {
  userName: string;
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">پنل مدیریت</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">مدیر سیستم</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {userName.charAt(0)}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}