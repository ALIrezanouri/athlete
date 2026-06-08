/**
 * Batch 2: Convert remaining admin panel selects to MobileDrawerSelect
 * Pages: bookings, audit-log, trainers, exercises, wallets, gyms, translations, time-slots
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'adminpanel', 'app', '(dashboard)', 'dashboard');

function addImportIfNeeded(content) {
  if (content.includes('MobileDrawerSelect')) return content;
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith("import'") || lines[i].includes(" from '") || lines[i].includes(' from "')) {
      if (lines[i].trim().startsWith('import')) lastImportIdx = i;
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, "import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';");
  }
  return lines.join('\n');
}

function replaceSelect(content, searchStr, replacement) {
  const idx = content.indexOf(searchStr);
  if (idx === -1) {
    console.log(`  ⚠️ NOT FOUND: "${searchStr.substring(0, 70)}..."`);
    return content;
  }
  // Find closing </select>
  const closeIdx = content.indexOf('</select>', idx);
  if (closeIdx === -1) {
    console.log(`  ⚠️ NO </select>: "${searchStr.substring(0, 70)}..."`);
    return content;
  }
  const block = content.substring(idx, closeIdx + '</select>'.length);
  console.log(`  ✅ Found and replacing select block`);
  return content.replace(block, replacement);
}

function processPage(relPath, replacements) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = addImportIfNeeded(content);
  for (const [searchStr, replacement] of replacements) {
    content = replaceSelect(content, searchStr, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`📝 Saved: ${relPath}`);
}

// ══════════════════════════════════════════════════════════
// BOOKINGS (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('bookings', 'page.tsx'), [
  // Select 1: Status filter
  [`          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
            className="w-full md:w-64 px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"`,
   `<MobileDrawerSelect
            value={statusFilter}
            onChange={(v) => handleStatusFilterChange(v as StatusFilter)}
            placeholder="فیلتر وضعیت"
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            dir="rtl"
          />`],
  // Select 2: Inline status change per booking
  [`                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as StatusFilter)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"`,
   `<MobileDrawerSelect
                          value={newStatus}
                          onChange={(v) => setNewStatus(v as StatusFilter)}
                          placeholder="تغییر وضعیت"
                          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                          dir="rtl"
                        />`],
]);

// ══════════════════════════════════════════════════════════
// AUDIT-LOG (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('audit-log', 'page.tsx'), [
  // Select 1: Admin filter
  [`              <select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"`,
   `<MobileDrawerSelect
                value={adminFilter}
                onChange={setAdminFilter}
                placeholder="همه مدیران"
                options={[{ value: '', label: 'همه مدیران' }, ...admins.map((admin: any) => ({ value: admin.id, label: admin.email }))]}
                dir="rtl"
              />`],
  // Select 2: Action filter
  [`              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"`,
   `<MobileDrawerSelect
                value={actionFilter}
                onChange={setActionFilter}
                placeholder="همه عملیات"
                options={[{ value: '', label: 'همه عملیات' }, ...AUDIT_ACTIONS.map((action: any) => ({ value: action.value, label: action.label }))]}
                dir="rtl"
              />`],
]);

// ══════════════════════════════════════════════════════════
// TRAINERS (1 select)
// ══════════════════════════════════════════════════════════
processPage(path.join('trainers', 'page.tsx'), [
  [`                <select
                  value={formData.gym_id}
                  onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
                  className={inputClass(formErrors.gym_id)}`,
   `<MobileDrawerSelect
                  value={formData.gym_id}
                  onChange={(v) => setFormData({ ...formData, gym_id: v })}
                  placeholder="انتخاب باشگاه"
                  options={[{ value: '', label: 'انتخاب باشگاه' }, ...gyms.map((gym: any) => ({ value: gym.id, label: gym.name }))]}
                  dir="rtl"
                  error={!!formErrors.gym_id}
                />`],
]);

// ══════════════════════════════════════════════════════════
// TIME-SLOTS (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('time-slots', 'page.tsx'), [
  // Select 1: Gym filter
  [`        <select
          value={filterGymId}
          onChange={(e) => handleGymFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white"`,
   `<MobileDrawerSelect
          value={filterGymId}
          onChange={handleGymFilter}
          placeholder="همه باشگاه‌ها"
          options={[{ value: '', label: 'همه باشگاه‌ها' }, ...gyms.map((gym: any) => ({ value: gym.id, label: gym.name }))]}
          dir="rtl"
        />`],
  // Select 2: Gym select in form
  [`                <select
                  value={formData.gym_id}
                  onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
                  className={inputClass(formErrors.gym_id)}`,
   `<MobileDrawerSelect
                  value={formData.gym_id}
                  onChange={(v) => setFormData({ ...formData, gym_id: v })}
                  placeholder="انتخاب باشگاه"
                  options={[{ value: '', label: 'انتخاب باشگاه' }, ...gyms.map((gym: any) => ({ value: gym.id, label: gym.name }))]}
                  dir="rtl"
                  error={!!formErrors.gym_id}
                />`],
]);

// ══════════════════════════════════════════════════════════
// TRANSLATIONS (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('translations', 'page.tsx'), [
  // Select 1: Language filter
  [`          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"`,
   `<MobileDrawerSelect
            value={langFilter}
            onChange={setLangFilter}
            placeholder="همه زبان‌ها"
            options={[
              { value: '', label: 'همه زبان‌ها' },
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'انگلیسی' },
            ]}
            dir="rtl"
          />`],
  // Select 2: Language in form
  [`                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className={inputClass()}`,
   `<MobileDrawerSelect
                      value={formData.language}
                      onChange={(v) => setFormData({ ...formData, language: v })}
                      placeholder="انتخاب زبان"
                      options={[
                        { value: 'fa', label: 'فارسی' },
                        { value: 'en', label: 'انگلیسی' },
                      ]}
                      dir="rtl"
                    />`],
]);

// ══════════════════════════════════════════════════════════
// GYMS (1 select - country in form)
// ══════════════════════════════════════════════════════════
processPage(path.join('gyms', 'page.tsx'), [
  [`                <select
                  value={formData.country_id}
                  onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                  className={inputClass(formErrors.country_id)}`,
   `<MobileDrawerSelect
                  value={formData.country_id}
                  onChange={(v) => setFormData({ ...formData, country_id: v })}
                  placeholder="انتخاب کشور"
                  options={[{ value: '', label: 'انتخاب کشور' }, ...countries.map((country: any) => ({ value: country.id, label: country.name }))]}
                  dir="rtl"
                  error={!!formErrors.country_id}
                />`],
]);

console.log('\n✅ Batch 2 complete (bookings, audit-log, trainers, time-slots, translations, gyms)');