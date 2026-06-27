import { redirect } from "next/navigation";
import { getUserAchievements, isAchievementsEnabled, CATEGORY_LABELS } from "@/app/actions/achievements";
import { AchievementCard } from "@/components/gamification/AchievementCard";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  // Check feature flag
  const enabled = await isAchievementsEnabled();
  if (!enabled) {
    redirect("/home");
  }

  const result = await getUserAchievements();

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-white/60">{result.error || "خطا در بارگذاری دستاوردها"}</p>
        </div>
      </div>
    );
  }

  const achievements = result.data;
  const unlocked = achievements.filter((a) => a.is_unlocked);
  const inProgress = achievements.filter((a) => !a.is_unlocked);

  // Group by category
  const categories = [...new Set(achievements.map((a) => a.category))] as string[];

  return (
    <div className="min-h-screen bg-black text-white pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">دستاوردها</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">باز شده:</span>
            <span className="font-bold text-amber-400">
              {unlocked.length}
              <span className="text-white/30">/{achievements.length}</span>
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
            style={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievement Categories */}
      <div className="px-5 py-5 space-y-8">
        {categories.map((cat) => {
          const catAchievements = achievements.filter((a) => a.category === cat);
          const catUnlocked = catAchievements.filter((a) => a.is_unlocked).length;

          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white/80">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <span className="text-xs text-white/40">
                  {catUnlocked}/{catAchievements.length}
                </span>
              </div>

              {/* Achievement grid */}
              <div className="grid grid-cols-2 gap-3">
                {catAchievements.map((ach) => (
                  <AchievementCard key={ach.id} achievement={ach} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}