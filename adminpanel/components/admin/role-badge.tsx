// Role Badge Component
import { UserRole } from '@/app/actions/types';

interface RoleBadgeProps {
  role: UserRole;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const roleConfig: Record<UserRole, { label: string; color: string; bgColor: string }> = {
    admin: { label: 'مدیر سیستم', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    gym_manager: { label: 'مدیر سالن', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    coach: { label: 'مربی', color: 'text-green-700', bgColor: 'bg-green-100' },
    doctor: { label: 'پزشک', color: 'text-red-700', bgColor: 'bg-red-100' },
    athlete: { label: 'ورزشکار', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  };

  const config = roleConfig[role];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}