'use client';

import React from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { dateObjectToGregorian, gregorianToDateObject } from '@/lib/jalali';

interface JalaliDatePickerProps {
  value: string;
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export default function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  error,
  label,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  className = '',
}: JalaliDatePickerProps) {
  const dateValue = gregorianToDateObject(value);

  const handleChange = (date: DateObject | DateObject[] | null) => {
    if (!date) { onChange(''); return; }
    const singleDate = Array.isArray(date) ? date[0] : date;
    if (singleDate) {
      onChange(dateObjectToGregorian(singleDate));
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1.5">
          {label}
          {required && <span className="text-red-400 mr-1">*</span>}
        </label>
      )}
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        value={dateValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        minDate={minDate ? gregorianToDateObject(minDate) : undefined}
        maxDate={maxDate ? gregorianToDateObject(maxDate) : undefined}
        calendarPosition="bottom-center"
        format="YYYY/MM/DD"
        containerStyle={{ width: '100%' }}
        inputClass={`w-full px-4 py-2.5 bg-white/5 border ${
          error ? 'border-red-500' : 'border-white/10'
        } rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-foreground text-right cursor-pointer disabled:opacity-50`}
        className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl"
        style={{ backgroundColor: 'rgb(15 23 42)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}