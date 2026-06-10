/**
 * Gamification Engine for Rokhdad FIT
 * Maps workout volume to creative comparisons and athlete levels.
 */

export interface VolumeComparison {
  object: string;
  emoji: string;
  count: number;
}

export interface AthleteLevel {
  title: string;
  minVolume: number;
  nextLevel?: string;
  remainingToNext?: number;
}

const COMPARISONS = [
  { object: "فیل آفریقایی", emoji: "🐘", weight: 6000 },
  { object: "ماشین لندکروزر", emoji: "🚘", weight: 2600 },
  { object: "اسب ترکمن", emoji: "🐎", weight: 500 },
  { object: "کیسه برنج", emoji: "🍚", weight: 10 },
  { object: "وزنه ۱۰۰ کیلویی", emoji: "🏋️", weight: 100 },
  { object: "پیانو", emoji: "🎹", weight: 220 },
  { object: "موتور سیکلت", emoji: "🏍️", weight: 180 },
  { object: "نهنگ آبی", emoji: "🐋", weight: 150000 },
];

const LEVELS: AthleteLevel[] = [
  { title: "نوآموز", minVolume: 0, nextLevel: "پهلوان نوپا" },
  { title: "پهلوان نوپا", minVolume: 5000, nextLevel: "عیار" },
  { title: "عیار", minVolume: 20000, nextLevel: "گردآفرید" },
  { title: "گردآفرید", minVolume: 100000, nextLevel: "رستم" },
  { title: "رستم", minVolume: 500000, nextLevel: "هرکول" },
  { title: "هرکول", minVolume: 1000000, nextLevel: "پهلوان ابدی" },
  { title: "پهلوان ابدی", minVolume: 5000000 },
];

export function getVolumeComparison(volumeKg: number): VolumeComparison {
  // Sort comparisons by weight descending
  const sorted = [...COMPARISONS].sort((a, b) => b.weight - a.weight);

  for (const comp of sorted) {
    if (volumeKg >= comp.weight) {
      return {
        object: comp.object,
        emoji: comp.emoji,
        count: Math.floor(volumeKg / comp.weight),
      };
    }
  }

  return {
    object: "کیسه برنج",
    emoji: "🍚",
    count: Math.floor(volumeKg / 10),
  };
}

export function getAthleteLevel(totalVolume: number): AthleteLevel {
  let currentLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (totalVolume >= level.minVolume) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const levelIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[levelIndex + 1];

  return {
    ...currentLevel,
    remainingToNext: nextLevel ? nextLevel.minVolume - totalVolume : 0,
    nextLevel: nextLevel?.title,
  };
}

export function getFunFact(volumeKg: number): string {
  const comp = getVolumeComparison(volumeKg);
  const countStr = comp.count.toLocaleString('fa-IR');
  return `امروز معادل ${countStr} ${comp.object} ${comp.emoji} وزنه زدی!`;
}
