/**
 * Batch 3: Convert remaining selects using regex-based flexible matching
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'adminpanel', 'app', '(dashboard)', 'dashboard');

function addImportIfNeeded(content) {
  if (content.includes('MobileDrawerSelect')) return content;
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, "import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';");
  }
  return lines.join('\n');
}

// Match a select by its value prop pattern, extract the full block up to </select>
function replaceSelectByValue(content, valuePattern, replacement) {
  // Find <select ... value={valuePattern} ...>
  const regex = new RegExp(`<select[^>]*value=\\{${valuePattern}\\}[^>]*>[\\s\\S]*?<\\/select>`, 'g');
  const match = regex.exec(content);
  if (!match) {
    console.log(`  ⚠️ NOT FOUND: value={${valuePattern}}`);
    return content;
  }
  console.log(`  ✅ Found select with value={${valuePattern}} at index ${match.index}`);
  return content.replace(match[0], replacement);
}

// Match a select by a unique substring in the line
function replaceSelectByLine(content, uniqueSubstring, replacement) {
  const lines = content.split('\n');
  let startLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<select') && lines[i].includes(uniqueSubstring)) {
      startLineIdx = i;
      break;
    }
  }
  if (startLineIdx === -1) {
    console.log(`  ⚠️ NOT FOUND line with: "${uniqueSubstring}"`);
    return content;
  }
  
  // Find closing </select> line
  let endLineIdx = -1;
  let depth = 0;
  for (let i = startLineIdx; i < lines.length; i++) {
    if (lines[i].includes('<select')) depth++;
    if (lines[i].includes('</select>')) { depth--; if (depth === 0) { endLineIdx = i; break; } }
  }
  if (endLineIdx === -1) {
    console.log(`  ⚠️ NO </select> for: "${uniqueSubstring}"`);
    return content;
  }
  
  const block = lines.slice(startLineIdx, endLineIdx + 1).join('\n');
  console.log(`  ✅ Found and replacing: "${uniqueSubstring}" (lines ${startLineIdx+1}-${endLineIdx+1})`);
  return content.replace(block, replacement);
}

function processPage(relPath, fn) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = addImportIfNeeded(content);
  content = fn(content);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`📝 Saved: ${relPath}`);
}

// ══════════════════════════════════════════════════════════
// BOOKINGS (1 remaining - line 198)
// ══════════════════════════════════════════════════════════
processPage(path.join('bookings', 'page.tsx'), (content) => {
  return replaceSelectByLine(content, 'value={newStatus}', `<MobileDrawerSelect
                          value={newStatus}
                          onChange={(v) => setNewStatus(v as StatusFilter)}
                          placeholder="تغییر وضعیت"
                          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                          dir="rtl"
                        />`);
});

// ══════════════════════════════════════════════════════════
// AUDIT-LOG (2 selects - lines 140, 159)
// ══════════════════════════════════════════════════════════
processPage(path.join('audit-log', 'page.tsx'), (content) => {
  content = replaceSelectByLine(content, 'value={adminFilter}', `<MobileDrawerSelect
                value={adminFilter}
                onChange={setAdminFilter}
                placeholder="همه مدیران"
                options={[{ value: '', label: 'همه مدیران' }, ...admins.map((admin: any) => ({ value: admin.id, label: admin.email }))]}
                dir="rtl"
              />`);
  content = replaceSelectByLine(content, 'value={actionFilter}', `<MobileDrawerSelect
                value={actionFilter}
                onChange={setActionFilter}
                placeholder="همه عملیات"
                options={[{ value: '', label: 'همه عملیات' }, ...AUDIT_ACTIONS.map((action: any) => ({ value: action.value, label: action.label }))]}
                dir="rtl"
              />`);
  return content;
});

// ══════════════════════════════════════════════════════════
// TRANSLATIONS (2 selects - lines 169, 309)
// ══════════════════════════════════════════════════════════
processPage(path.join('translations', 'page.tsx'), (content) => {
  content = replaceSelectByLine(content, 'value={langFilter}', `<MobileDrawerSelect
            value={langFilter}
            onChange={setLangFilter}
            placeholder="همه زبان‌ها"
            options={[
              { value: '', label: 'همه زبان‌ها' },
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'انگلیسی' },
            ]}
            dir="rtl"
          />`);
  content = replaceSelectByLine(content, 'value={formData.language}', `<MobileDrawerSelect
                      value={formData.language}
                      onChange={(v) => setFormData({ ...formData, language: v })}
                      placeholder="انتخاب زبان"
                      options={[
                        { value: 'fa', label: 'فارسی' },
                        { value: 'en', label: 'انگلیسی' },
                      ]}
                      dir="rtl"
                    />`);
  return content;
});

// ══════════════════════════════════════════════════════════
// EXERCISES (8 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('exercises', 'page.tsx'), (content) => {
  // Filter selects (lines 335, 345, 355)
  content = replaceSelectByLine(content, 'value={muscleGroupFilter}', `<MobileDrawerSelect
          value={muscleGroupFilter}
          onChange={setMuscleGroupFilter}
          placeholder="همه گروه‌های عضلانی"
          options={[{ value: '', label: 'همه گروه‌های عضلانی' }, ...muscleGroups.map((mg: any) => ({ value: mg.id, label: mg.name }))]}
          dir="rtl"
        />`);
  content = replaceSelectByLine(content, 'value={equipmentFilter}', `<MobileDrawerSelect
          value={equipmentFilter}
          onChange={setEquipmentFilter}
          placeholder="همه تجهیزات"
          options={[{ value: '', label: 'همه تجهیزات' }, ...equipmentTypes.map((eq: any) => ({ value: eq.id, label: eq.name }))]}
          dir="rtl"
        />`);
  content = replaceSelectByLine(content, 'value={typeFilter}', `<MobileDrawerSelect
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="همه انواع"
          options={[
            { value: '', label: 'همه انواع' },
            { value: 'compound', label: 'ترکیبی' },
            { value: 'isolation', label: 'مجزا' },
            { value: 'cardio', label: 'کاردیو' },
          ]}
          dir="rtl"
        />`);
  
  // Form selects (lines 502, 509, 516, 525, 532)
  content = replaceSelectByLine(content, 'value={formData.muscle_group_id}', `<MobileDrawerSelect
                      value={formData.muscle_group_id}
                      onChange={(v) => setFormData({...formData, muscle_group_id: v})}
                      placeholder="انتخاب گروه عضلانی"
                      options={muscleGroups.map((mg: any) => ({ value: mg.id, label: mg.name }))}
                      dir="rtl"
                      error={!!formErrors.muscle_group_id}
                    />`);
  content = replaceSelectByLine(content, 'value={formData.equipment_type_id}', `<MobileDrawerSelect
                      value={formData.equipment_type_id}
                      onChange={(v) => setFormData({...formData, equipment_type_id: v})}
                      placeholder="انتخاب تجهیزات"
                      options={equipmentTypes.map((eq: any) => ({ value: eq.id, label: eq.name }))}
                      dir="rtl"
                    />`);
  content = replaceSelectByLine(content, 'value={formData.exercise_type}', `<MobileDrawerSelect
                      value={formData.exercise_type}
                      onChange={(v) => setFormData({...formData, exercise_type: v})}
                      placeholder="نوع تمرین"
                      options={[
                        { value: 'compound', label: 'ترکیبی' },
                        { value: 'isolation', label: 'مجزا' },
                        { value: 'cardio', label: 'کاردیو' },
                      ]}
                      dir="rtl"
                    />`);
  content = replaceSelectByLine(content, 'value={formData.movement_pattern}', `<MobileDrawerSelect
                      value={formData.movement_pattern}
                      onChange={(v) => setFormData({...formData, movement_pattern: v})}
                      placeholder="الگوی حرکتی"
                      options={[
                        { value: 'push', label: 'فشار' },
                        { value: 'pull', label: 'کشش' },
                        { value: 'squat', label: 'اسکات' },
                        { value: 'hinge', label: 'لولایی' },
                        { value: 'lunge', label: 'لانج' },
                        { value: 'carry', label: 'حمل' },
                        { value: 'rotation', label: 'چرخش' },
                      ]}
                      dir="rtl"
                    />`);
  content = replaceSelectByLine(content, 'value={formData.difficulty}', `<MobileDrawerSelect
                      value={formData.difficulty}
                      onChange={(v) => setFormData({...formData, difficulty: v})}
                      placeholder="سطح دشواری"
                      options={[
                        { value: 'beginner', label: 'مبتدی' },
                        { value: 'intermediate', label: 'متوسط' },
                        { value: 'advanced', label: 'پیشرفته' },
                      ]}
                      dir="rtl"
                    />`);
  return content;
});

// ══════════════════════════════════════════════════════════
// WALLETS (2 selects - lines 317, 409)
// ══════════════════════════════════════════════════════════
processPage(path.join('wallets', 'page.tsx'), (content) => {
  content = replaceSelectByLine(content, 'value={walletFilter}', `<MobileDrawerSelect
                  value={walletFilter}
                  onChange={setWalletFilter}
                  placeholder="همه کیف‌ها"
                  options={[
                    { value: '', label: 'همه کیف‌ها' },
                    { value: 'positive', label: 'موجودی مثبت' },
                    { value: 'zero', label: 'موجودی صفر' },
                    { value: 'negative', label: 'موجودی منفی' },
                  ]}
                  dir="rtl"
                />`);
  content = replaceSelectByLine(content, 'value={actionType}', `<MobileDrawerSelect
                  value={actionType}
                  onChange={setActionType}
                  placeholder="نوع عملیات"
                  options={[
                    { value: 'credit', label: 'شارژ' },
                    { value: 'debit', label: 'کسر' },
                  ]}
                  dir="rtl"
                />`);
  return content;
});

console.log('\n✅ Batch 3 complete (bookings, audit-log, translations, exercises, wallets)');