/**
 * Batch 4: Handle multi-line selects where <select and value= are on different lines
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

// Find a <select block by looking for <select line, then scanning next lines for valuePattern
function replaceMultiLineSelect(content, valuePattern, replacement) {
  const lines = content.split('\n');
  let startLineIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<select') && !lines[i].includes('</select>')) {
      // Check if this or the next few lines contain the valuePattern
      const block = lines.slice(i, Math.min(i + 4, lines.length)).join('\n');
      if (block.includes(`value={${valuePattern}}`)) {
        startLineIdx = i;
        break;
      }
    }
  }
  
  if (startLineIdx === -1) {
    console.log(`  ⚠️ NOT FOUND: value={${valuePattern}}`);
    return content;
  }
  
  // Find closing </select>
  let endLineIdx = -1;
  for (let i = startLineIdx; i < lines.length; i++) {
    if (lines[i].includes('</select>')) {
      endLineIdx = i;
      break;
    }
  }
  
  if (endLineIdx === -1) {
    console.log(`  ⚠️ NO </select> for: ${valuePattern}`);
    return content;
  }
  
  const block = lines.slice(startLineIdx, endLineIdx + 1).join('\n');
  console.log(`  ✅ Found: value={${valuePattern}} (lines ${startLineIdx+1}-${endLineIdx+1})`);
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
// BOOKINGS - booking.status select (line 198)
// ══════════════════════════════════════════════════════════
processPage(path.join('bookings', 'page.tsx'), (content) => {
  return replaceMultiLineSelect(content, 'booking.status', `<MobileDrawerSelect
                          value={booking.status}
                          onChange={(v) => handleStatusUpdate(booking.id, v)}
                          placeholder="تغییر وضعیت"
                          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                          dir="rtl"
                        />`);
});

// ══════════════════════════════════════════════════════════
// AUDIT-LOG (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('audit-log', 'page.tsx'), (content) => {
  content = replaceMultiLineSelect(content, 'selectedAdmin', `<MobileDrawerSelect
                value={selectedAdmin}
                onChange={setSelectedAdmin}
                placeholder="همه مدیران"
                options={[{ value: '', label: 'همه مدیران' }, ...admins.map((admin: any) => ({ value: admin.id, label: admin.email }))]}
                dir="rtl"
              />`);
  content = replaceMultiLineSelect(content, 'selectedActionType', `<MobileDrawerSelect
                value={selectedActionType}
                onChange={setSelectedActionType}
                placeholder="همه عملیات"
                options={[{ value: '', label: 'همه عملیات' }, ...AUDIT_ACTIONS.map((a: any) => ({ value: a.value, label: a.label }))]}
                dir="rtl"
              />`);
  return content;
});

// ══════════════════════════════════════════════════════════
// EXERCISES filter selects (3 remaining at lines 336, 346, 356)
// ══════════════════════════════════════════════════════════
processPage(path.join('exercises', 'page.tsx'), (content) => {
  content = replaceMultiLineSelect(content, 'muscleGroupFilter', `<MobileDrawerSelect
            value={muscleGroupFilter}
            onChange={(v) => { setMuscleGroupFilter(v); setPage(1); }}
            placeholder="همه گروه‌های عضلانی"
            options={[{ value: '', label: 'همه گروه‌های عضلانی' }, ...muscleGroups.map((mg: any) => ({ value: mg.id, label: mg.name }))]}
            dir="rtl"
          />`);
  content = replaceMultiLineSelect(content, 'equipmentFilter', `<MobileDrawerSelect
            value={equipmentFilter}
            onChange={(v) => { setEquipmentFilter(v); setPage(1); }}
            placeholder="همه تجهیزات"
            options={[{ value: '', label: 'همه تجهیزات' }, ...equipmentTypes.map((eq: any) => ({ value: eq.id, label: eq.name }))]}
            dir="rtl"
          />`);
  content = replaceMultiLineSelect(content, 'exerciseTypeFilter', `<MobileDrawerSelect
            value={exerciseTypeFilter}
            onChange={(v) => { setExerciseTypeFilter(v); setPage(1); }}
            placeholder="همه انواع"
            options={[
              { value: '', label: 'همه انواع' },
              { value: 'compound', label: 'ترکیبی' },
              { value: 'isolation', label: 'مجزا' },
              { value: 'cardio', label: 'کاردیو' },
            ]}
            dir="rtl"
          />`);
  return content;
});

// ══════════════════════════════════════════════════════════
// WALLETS (2 selects - both value={selectedUserId})
// Need to differentiate: first one is filter, second is action
// ══════════════════════════════════════════════════════════
processPage(path.join('wallets', 'page.tsx'), (content) => {
  // Replace both selectedUserId selects - they're identical, so we do first occurrence then second
  const lines = content.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<select') && !lines[i].includes('</select>')) {
      const block = lines.slice(i, Math.min(i + 4, lines.length)).join('\n');
      if (block.includes('value={selectedUserId}')) {
        // Find </select>
        let endI = i;
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('</select>')) { endI = j; break; }
        }
        const blockText = lines.slice(i, endI + 1).join('\n');
        if (count === 0) {
          // First select (filter - around line 318)
          lines.splice(i, endI - i + 1, `<MobileDrawerSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="انتخاب کاربر"
                    options={[{ value: '', label: 'همه کاربران' }, ...users.map((u: any) => ({ value: u.id, label: u.full_name || u.mobile_number }))]}
                    dir="rtl"
                  />`);
          console.log(`  ✅ Replaced wallet select #1 (filter)`);
        } else {
          // Second select (action - around line 410)
          lines.splice(i, endI - i + 1, `<MobileDrawerSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="انتخاب کاربر"
                    options={users.map((u: any) => ({ value: u.id, label: u.full_name || u.mobile_number }))}
                    dir="rtl"
                  />`);
          console.log(`  ✅ Replaced wallet select #2 (action)`);
        }
        count++;
        break; // restart loop since indices changed
      }
    }
  }
  // Handle second occurrence
  const content2 = lines.join('\n');
  const lines2 = content2.split('\n');
  for (let i = 0; i < lines2.length; i++) {
    if (lines2[i].includes('<select') && !lines2[i].includes('</select>')) {
      const block = lines2.slice(i, Math.min(i + 4, lines2.length)).join('\n');
      if (block.includes('value={selectedUserId}')) {
        let endI = i;
        for (let j = i; j < lines2.length; j++) {
          if (lines2[j].includes('</select>')) { endI = j; break; }
        }
        lines2.splice(i, endI - i + 1, `<MobileDrawerSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="انتخاب کاربر"
                    options={users.map((u: any) => ({ value: u.id, label: u.full_name || u.mobile_number }))}
                    dir="rtl"
                  />`);
        console.log(`  ✅ Replaced wallet select #2`);
        break;
      }
    }
  }
  return lines2.join('\n');
});

// ══════════════════════════════════════════════════════════
// TRANSLATIONS (2 selects)
// ══════════════════════════════════════════════════════════
processPage(path.join('translations', 'page.tsx'), (content) => {
  content = replaceMultiLineSelect(content, 'localeFilter', `<MobileDrawerSelect
            value={localeFilter}
            onChange={setLocaleFilter}
            placeholder="همه زبان‌ها"
            options={[
              { value: '', label: 'همه زبان‌ها' },
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'انگلیسی' },
            ]}
            dir="rtl"
          />`);
  content = replaceMultiLineSelect(content, 'formData.locale', `<MobileDrawerSelect
                      value={formData.locale}
                      onChange={(v) => setFormData({ ...formData, locale: v })}
                      placeholder="انتخاب زبان"
                      options={[
                        { value: 'fa', label: 'فارسی' },
                        { value: 'en', label: 'انگلیسی' },
                      ]}
                      dir="rtl"
                    />`);
  return content;
});

console.log('\n✅ Batch 4 complete!');