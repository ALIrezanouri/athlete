'use client';

import React from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { dateObjectToGregorian, gregorianToDateObject } from '@/lib/jalali';

interface JalaliDatePickerProps {
  /** Gregorian date string (YYYY-MM-DD) from Supabase */
  value: string;
  /** Called with Gregorian date string (YYYY-MM-DD) when date changes */
  onChange: (gregorianDate: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Label text */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Minimum selectable date (Gregorian YYYY-MM-DD) */
  minDate?: string;
  /** Maximum selectable date (Gregorian YYYY-MM-DD) */
  maxDate?: string;
  /** Additional CSS classes */
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
    if (!date) {
      onChange('');
      return;
    }
    const singleDate = Array.isArray(date) ? date[0] : date;
    if (singleDate) {
      const gregorianStr = dateObjectToGregorian(singleDate);
      onChange(gregorianStr);
    }
  };

  const minDateObj = minDate ? gregorianToDateObject(minDate) : undefined;
  const maxDateObj = maxDate ? gregorianToDateObject(maxDate) : undefined;

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
        minDate={minDateObj}
        maxDate={maxDateObj}
        calendarPosition="bottom-center"
        format="YYYY/MM/DD"
        containerStyle={{ width: '100%' }}
        inputClass={`w-full px-4 py-2.5 bg-white/5 border ${
          error ? 'border-red-500' : 'border-white/10'
        } rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white text-right cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        className="bg-slate-900 border border-white/10 rounded-lg shadow-2xl"
        style={{
          backgroundColor: 'rgb(15 23 42)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
        }}
      />

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}