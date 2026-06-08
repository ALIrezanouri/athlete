/**
 * Jalali (Shamsi) Date Utilities
 * Uses react-multi-date-picker's DateObject for conversion
 * All Supabase storage is Gregorian (YYYY-MM-DD), display is Jalali
 */

import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to Jalali display string (YYYY/MM/DD)
 */
export function gregorianToJalali(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const dateObj = new DateObject({
      date: new Date(dateStr),
      calendar: gregorian,
    });
    dateObj.convert(persian);
    return `${dateObj.year}/${String(dateObj.month).padStart(2, '0')}/${String(dateObj.day).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

/**
 * Convert a Jalali date string (YYYY/MM/DD) to Gregorian (YYYY-MM-DD) for Supabase
 */
export function jalaliToGregorian(jalaliStr: string | null | undefined): string {
  if (!jalaliStr) return '';
  try {
    const parts = jalaliStr.split('/').map(Number);
    if (parts.length !== 3) return jalaliStr;
    const dateObj = new DateObject({
      calendar: persian,
      year: parts[0],
      month: parts[1],
      day: parts[2],
    });
    dateObj.convert(gregorian);
    return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
  } catch {
    return jalaliStr;
  }
}

/**
 * Convert a DateObject (from the datepicker) to Gregorian YYYY-MM-DD string for Supabase
 */
export function dateObjectToGregorian(dateObj: DateObject | null | undefined): string {
  if (!dateObj) return '';
  try {
    const converted = dateObj.convert(gregorian);
    return `${converted.year}-${String(converted.month).padStart(2, '0')}-${String(converted.day).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Create a DateObject from a Gregorian date string for the Jalali datepicker
 */
export function gregorianToDateObject(dateStr: string | null | undefined): DateObject | undefined {
  if (!dateStr) return undefined;
  try {
    return new DateObject({
      date: new Date(dateStr),
      calendar: persian,
    });
  } catch {
    return undefined;
  }
}

/**
 * Format a full ISO datetime string to Jalali with time
 */
export function formatJalaliDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const dateObj = new DateObject({ date, calendar: gregorian });
    dateObj.convert(persian);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${dateObj.year}/${String(dateObj.month).padStart(2, '0')}/${String(dateObj.day).padStart(2, '0')} - ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get today's date as Gregorian YYYY-MM-DD
 */
export function todayGregorian(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get today's date as Jalali DateObject (for datepicker default value)
 */
export function todayJalaliDateObject(): DateObject {
  return new DateObject({
    date: new Date(),
    calendar: persian,
  });
}