declare module "jalaali-js" {
  interface JalaaliDate {
    jy: number;
    jm: number;
    jd: number;
  }

  interface GregorianDate {
    gy: number;
    gm: number;
    gd: number;
  }

  export function toJalaali(gy: number, gm: number, gd: number): JalaaliDate;
  export function toJalaali(date: Date): JalaaliDate;
  export function toGregorian(jy: number, jm: number, jd: number): GregorianDate;
  export function isLeapJalaaliYear(jy: number): boolean;
  export function jalaaliMonthLength(jy: number, jm: number): number;
  export function toJalaaliGregorian(jy: number, jm: number, jd: number): GregorianDate;
}
