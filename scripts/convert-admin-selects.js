/**
 * Automated script to convert <select> elements to MobileDrawerSelect in admin panel.
 * Adds import, converts each <select> block to <MobileDrawerSelect> component.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'adminpanel', 'app', '(dashboard)', 'dashboard');

// ── Helper: extract options from a <select> block ──
function extractOptions(selectBlock) {
  const optionRegex = /<option\s+([^>]*)>(.*?)<\/option>/gs;
  const options = [];
  let match;
  while ((match = optionRegex.exec(selectBlock)) !== null) {
    const attrs = match[1];
    const label = match[2];
    const valueMatch = attrs.match(/value=["']([^"']*)["']/);
    const value = valueMatch ? valueMatch[1] : '';
    options.push({ value, label });
  }
  return options;
}

// ── Helper: extract dynamic options pattern ──
function hasDynamicOptions(selectBlock) {
  return selectBlock.includes('.map(') || selectBlock.includes('.map (');
}

function processFile(filePath, conversions) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Add import if not present
  if (!content.includes('MobileDrawerSelect')) {
    // Find the last import line
    const importLines = content.split('\n').filter(l => l.startsWith('import '));
    if (importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      content = content.replace(
        lastImport,
        lastImport + "\nimport { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';"
      );
      modified = true;
    }
  }

  // Apply each conversion
  for (const conv of conversions) {
    // Find the select block
    const searchStart = conv.searchStart;
    const searchEnd = conv.searchEnd;
    
    const startIdx = content.indexOf(searchStart);
    if (startIdx === -1) {
      console.log(`  ⚠️  Could not find searchStart in ${filePath}: "${searchStart.substring(0, 60)}..."`);
      continue;
    }
    
    const endIdx = content.indexOf(searchEnd, startIdx);
    if (endIdx === -1) {
      console.log(`  ⚠️  Could not find searchEnd in ${filePath}: "${searchEnd.substring(0, 60)}..."`);
      continue;
    }
    
    const block = content.substring(startIdx, endIdx + searchEnd.length);
    const replacement = conv.replacement(block);
    
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx + searchEnd.length);
    modified = true;
    console.log(`  ✅ Converted select: ${conv.name}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  📝 Saved: ${filePath}`);
  }
}

// ══════════════════════════════════════════════════════════
// PAGES & CONVERSIONS
// ══════════════════════════════════════════════════════════

// ── reviews/page.tsx (1 select) ──
processFile(path.join(BASE, 'reviews', 'page.tsx'), [
  {
    name: 'Rating Filter',
    searchStart: '        <select\n          value={minRating',
    searchEnd: '        </select>',
    replacement: () => `        <MobileDrawerSelect
          value={String(minRating ?? '')}
          onChange={(v) => handleRatingFilter(v ? parseInt(v) : null)}
          placeholder="همه امتیازها"
          options={[
            { value: '', label: 'همه امتیازها' },
            { value: '1', label: '1+ ستاره' },
            { value: '2', label: '2+ ستاره' },
            { value: '3', label: '3+ ستاره' },
            { value: '4', label: '4+ ستاره' },
            { value: '5', label: '5 ستاره' },
          ]}
          dir="rtl"
        />`
  }
]);

// ── routines/page.tsx (2 selects) ──
processFile(path.join(BASE, 'routines', 'page.tsx'), [
  {
    name: 'Public Filter',
    searchStart: '          <select\n            value={publicFilter}',
    searchEnd: '          </select>',
    replacement: () => `          <MobileDrawerSelect
            value={publicFilter}
            onChange={(v) => { setPublicFilter(v); setPage(1); }}
            placeholder="همه (عمومی/خصوصی)"
            options={[
              { value: '', label: 'همه (عمومی/خصوصی)' },
              { value: 'true', label: 'عمومی' },
              { value: 'false', label: 'خصوصی' },
            ]}
            dir="rtl"
          />`
  },
  {
    name: 'Template Filter',
    searchStart: '          <select\n            value={templateFilter}',
    searchEnd: '          </select>',
    replacement: () => `          <MobileDrawerSelect
            value={templateFilter}
            onChange={(v) => { setTemplateFilter(v); setPage(1); }}
            placeholder="همه (قالب/عادی)"
            options={[
              { value: '', label: 'همه (قالب/عادی)' },
              { value: 'true', label: 'قالب' },
              { value: 'false', label: 'عادی' },
            ]}
            dir="rtl"
          />`
  }
]);

// ── users/page.tsx (2 selects) ──
processFile(path.join(BASE, 'users', 'page.tsx'), [
  {
    name: 'Role Filter',
    searchStart: '              <select\n                value={roleFilter}',
    searchEnd: '              </select>',
    replacement: () => `              <MobileDrawerSelect
                value={roleFilter}
                onChange={(v) => { setRoleFilter(v as UserRole | ''); setPage(1); }}
                placeholder="همه نقش‌ها"
                options={[
                  { value: '', label: 'همه نقش‌ها' },
                  { value: 'athlete', label: 'ورزشکار' },
                  { value: 'gym_manager', label: 'مدیر سالن' },
                  { value: 'coach', label: 'مربی' },
                  { value: 'doctor', label: 'پزشک' },
                  { value: 'admin', label: 'مدیر سیستم' },
                ]}
                dir="rtl"
              />`
  },
  {
    name: 'Edit Role',
    searchStart: '                      <select\n                        value={editForm.role}',
    searchEnd: '                      </select>',
    replacement: () => `                      <MobileDrawerSelect
                        value={editForm.role}
                        onChange={(v) => setEditForm({ ...editForm, role: v })}
                        placeholder="انتخاب نقش"
                        options={[
                          { value: 'athlete', label: 'ورزشکار' },
                          { value: 'gym_manager', label: 'مدیر سالن' },
                          { value: 'coach', label: 'مربی' },
                          { value: 'doctor', label: 'پزشک' },
                          { value: 'admin', label: 'مدیر سیستم' },
                        ]}
                        dir="rtl"
                      />`
  }
]);

console.log('\n✅ Batch 1 complete (reviews, routines, users)');