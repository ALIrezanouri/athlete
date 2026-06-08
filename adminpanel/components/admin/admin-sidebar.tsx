// Admin Sidebar Component with Role-Based Navigation
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/app/actions/types';

interface SidebarItem {
  name: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

const sidebarItems: SidebarItem[] = [
  { name: 'داشبورد', href: '/dashboard', icon: '📊', roles: ['admin'] },
  { name: 'کاربران', href: '/dashboard/users', icon: '👥', roles: ['admin'] },
  { name: 'باشگاه‌ها', href: '/dashboard/gyms', icon: '🏢', roles: ['admin', 'gym_manager'] },
  { name: 'رزروها', href: '/dashboard/bookings', icon: '📅', roles: ['admin', 'gym_manager', 'athlete'] },
  { name: 'کیف پول', href: '/dashboard/wallets', icon: '💰', roles: ['admin', 'athlete'] },
  { name: 'مربیان', href: '/dashboard/trainers', icon: '🏋️', roles: ['admin', 'gym_manager'] },
  { name: 'زمان‌بندی', href: '/dashboard/time-slots', icon: '⏰', roles: ['admin', 'gym_manager'] },
  { name: 'پروفایل باشگاه', href: '/dashboard/gym-profile', icon: '📋', roles: ['gym_manager'] },
  { name: 'آمار', href: '/dashboard/analytics', icon: '📈', roles: ['admin'] },
  { name: 'گزارشات', href: '/dashboard/reports', icon: '📑', roles: ['admin'] },
  { name: 'لاگ بررسی', href: '/dashboard/audit-log', icon: '🔍', roles: ['admin'] },
  { name: 'تنظیمات سیستم', href: '/dashboard/config', icon: '⚙️', roles: ['admin'] },
  { name: 'تمرینات', href: '/dashboard/exercises', icon: '💪', roles: ['admin'] },
  { name: 'جلسات تمرین', href: '/dashboard/workouts', icon: '🏋️', roles: ['admin'] },
  { name: 'برنامه‌های تمرین', href: '/dashboard/routines', icon: '📋', roles: ['admin'] },
  { name: 'اندازه‌های بدن', href: '/dashboard/body-stats', icon: '📏', roles: ['admin'] },
  { name: 'شبکه اجتماعی', href: '/dashboard/social', icon: '👥', roles: ['admin'] },
  { name: 'نظرات باشگاه', href: '/dashboard/reviews', icon: '⭐', roles: ['admin'] },
  { name: 'ترجمه‌ها', href: '/dashboard/translations', icon: '🌐', roles: ['admin'] },
  { name: 'کشورها', href: '/dashboard/countries', icon: '🌍', roles: ['admin'] },
];

interface AdminSidebarProps {
  role: UserRole;
}

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter items based on user role
  const filteredItems = sidebarItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-l border-gray-200 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">پنل مدیریت</h1>
        <nav className="space-y-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}