// Admin Dashboard - Redirect by Role
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectToRolePage = async () => {
      const result = await getCurrentUserProfile();
      
      if (!result.success || !result.data) {
        router.push('/login');
        return;
      }

      const role = result.data.role;

      // Redirect based on role — all paths use /dashboard/ prefix
      switch (role) {
        case 'admin':
          router.push('/dashboard/users');
          break;
        case 'gym_manager':
          router.push('/dashboard/gyms');
          break;
        case 'coach':
          router.push('/dashboard/bookings');
          break;
        case 'doctor':
          router.push('/dashboard/users');
          break;
        case 'athlete':
          router.push('/dashboard/bookings');
          break;
        default:
          router.push('/login');
      }
    };

    redirectToRolePage();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">در حال انتقال به پنل مدیریت...</p>
      </div>
    </div>
  );
}