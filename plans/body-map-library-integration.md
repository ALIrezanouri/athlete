# Body Map: `simple-body-highlighter-react` Integration Plan

## Current State Summary

| File | Role | Lines | Quality |
|------|------|-------|---------|
| [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) | Page orchestrator | 152 | Good — clean state, data flow |
| [`BodyMapSVG.tsx`](athlete-pwa/components/body-map/BodyMapSVG.tsx) | Custom SVG body map | 337 | **Critical** — crude geometric primitives, hardcoded paths, misaligned regions |
| [`MuscleSelectorChips.tsx`](athlete-pwa/components/body-map/MuscleSelectorChips.tsx) | Chip selector | 53 | Good — mobile-friendly, RTL |
| [`ExerciseCard.tsx`](athlete-pwa/components/body-map/ExerciseCard.tsx) | Exercise result card | 110 | Good — badges, difficulty, equipment |
| [`ExerciseResultsPanel.tsx`](athlete-pwa/components/body-map/ExerciseResultsPanel.tsx) | Results panel | 84 | Good — skeleton, empty state, animation |

**Core problem**: [`BodyMapSVG.tsx`](athlete-pwa/components/body-map/BodyMapSVG.tsx) — hand-drawn SVG paths produce a wireframe sketch, not a polished fitness app body map. Misaligned regions, incomplete mapping, poor touch targets.

**Previous plan** ([`body-map-redesign.md`](plans/body-map-redesign.md)) rejected `react-body-highlighter` citing React 19 incompatibility. **`simple-body-highlighter-react` v1.0.7 explicitly supports React 19** (`peerDependencies: react ^18 || ^19`). This changes the decision.

---

## Library API Quick Reference

`simple-body-highlighter-react` v1.0.7:

```tsx
import { Body } from 'simple-body-highlighter-react'
import type { BodyPartSlug, BodyPartData } from 'simple-body-highlighter-react'

<Body
  data={[{ slug: "left-biceps", color: "#4F8EF7" }]}  // highlighted parts
  onClick={(slug) => ...}                               // click handler
  gender="male"                                         // male | female
  side="front"                                          // front | back
  scale={1}                                             // SVG scale factor
  border="#3A3A3C"                                      // outline color | "none"
  defaultFill="#2C2C2E"                                 // non-highlighted fill
  disabledParts={[]}                                    // grayed out slugs
  hiddenParts={[]}                                      // not rendered slugs
/>
```

**44 body part slugs** — bilateral with `left-`/`right-` prefixes + centerline (`abs`, `neck`, `head`, `hair`).

---

## Slug → DB Muscle Group Mapping

Library uses granular left/right slugs. DB uses group-level IDs. Need mapping layer.

| DB `muscle_groups.id` | Library Slugs (front) | Library Slugs (back) | Persian Label |
|------------------------|----------------------|---------------------|---------------|
| `shoulders` | `left-deltoids`, `right-deltoids` | `left-deltoids`, `right-deltoids` | سرشانه |
| `chest` | `left-chest`, `right-chest` | — | سینه |
| `biceps` | `left-biceps`, `right-biceps` | — | جلو بازو |
| `triceps` | — | `left-triceps`, `right-triceps` | پشت بازو |
| `forearms` | `left-forearm`, `right-forearm` | `left-forearm`, `right-forearm` | ساعد |
| `abs` | `abs` | — | شکم |
| `quads` | `left-quadriceps`, `right-quadriceps` | — | جلو ران |
| `calves` | `left-calves`, `right-calves` | `left-calves`, `right-calves` | ساق پا |
| `back` | — | `left-upper-back`, `right-upper-back` | پشت |
| `traps` | — | `left-trapezius`, `right-trapezius` | ذوزنقه |
| `glutes` | — | `left-gluteal`, `right-gluteal` | باسن |
| `hamstrings` | — | `left-hamstring`, `right-hamstring` | پشت ران |
| `neck` | `neck` | `left-neck`, `right-neck` | گردن |
| `obliques` | `left-obliques`, `right-obliques` | — | پهلو |
| `lower-back` | — | `left-lower-back`, `right-lower-back` | کمر پایین |
| `adductors` | `left-adductors`, `right-adductors` | — | داخل ران |

**Bonus**: Library provides slugs DB seed doesn't cover (`obliques`, `lower-back`, `adductors`, `tibialis`, `knees`, `ankles`, `feet`, `hands`). We can hide irrelevant ones via `hiddenParts`.

---

## Phased Execution Strategy

Each phase is a minimal, self-contained upgrade. Verify after each before proceeding.

### Phase 0: Install & Smoke Test

**Goal**: Library renders in our app without errors.

**Steps**:
1. `npm install simple-body-highlighter-react` in `athlete-pwa`
2. Create temporary smoke-test: render `<Body side="front" data={[]} defaultFill="#2C2C2E" border="#3A3A3C" />` in body-map page
3. Verify: no SSR errors, SVG renders, click events fire
4. If SSR issues: wrap in `dynamic(() => import(...), { ssr: false })` — Next.js 16 SSR may choke on inline SVG

**Files**: [`package.json`](athlete-pwa/package.json), [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) (temp smoke test)

**Verify**: Page loads, body SVG visible, no console errors.

---

### Phase 1: Slug Mapping Module

**Goal**: Create pure data module mapping library slugs ↔ DB muscle group IDs.

**Steps**:
1. Create [`athlete-pwa/lib/body-map/muscle-mapping.ts`](athlete-pwa/lib/body-map/muscle-mapping.ts)
2. Define `MUSCLE_GROUP_TO_SLUGS`: DB ID → { front slugs, back slugs, label, icon }
3. Define `SLUG_TO_MUSCLE_GROUP`: reverse lookup — any slug → DB muscle group ID
4. Define `FRONT_VIEW_GROUPS` / `BACK_VIEW_GROUPS`: which DB groups appear per view
5. Export `getHighlightData(selectedMuscle, hoveredMuscle)`: converts selection state → `BodyPartData[]` for library

**File**: [`athlete-pwa/lib/body-map/muscle-mapping.ts`](athlete-pwa/lib/body-map/muscle-mapping.ts) (new)

**Verify**: Unit-testable pure functions. No React dependency.

---

### Phase 2: Replace BodyMapSVG with Library Wrapper

**Goal**: Swap custom SVG component for `simple-body-highlighter-react` wrapper.

**Steps**:
1. Create [`athlete-pwa/components/body-map/BodyHighlighter.tsx`](athlete-pwa/components/body-map/BodyHighlighter.tsx) — thin wrapper around library `Body`
2. Props: `{ view, selectedMuscle, hoveredMuscle, onSelectMuscle, onHoverMuscle }` (same interface as current BodyMapSVG)
3. Use `getHighlightData()` from mapping module to build `data` prop
4. Handle `onClick` — convert slug → muscle group ID via `SLUG_TO_MUSCLE_GROUP`
5. Dark theme styling: `defaultFill="#2C2C2E"`, `border="#3A3A3C"`
6. `hiddenParts`: hide irrelevant slugs (head, hair, hands, feet, knees, ankles, tibialis)
7. Dynamic import if SSR issues discovered in Phase 0

**File**: [`athlete-pwa/components/body-map/BodyHighlighter.tsx`](athlete-pwa/components/body-map/BodyHighlighter.tsx) (new)

**Verify**: Body map renders with library. Clicking a muscle region fires `onSelectMuscle` with correct DB ID.

---

### Phase 3: Wire Up Page Integration

**Goal**: Replace `BodyMapSVG` import with `BodyHighlighter` in page.

**Steps**:
1. In [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx): swap `import { BodyMapSVG }` → `import { BodyHighlighter }`
2. Update JSX: `<BodyHighlighter ...>` with same props
3. Remove `hoveredMuscle` state if library doesn't support hover visual (library uses `data` for highlighting, no hover API) — simplify state
4. Keep `selectedMuscle`, `view`, `exercises`, `loading` states unchanged

**File**: [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) (modify)

**Verify**: Full page works — toggle front/back, click muscle, exercises load.

---

### Phase 4: Style & Theme Integration

**Goal**: Match library rendering to Hevy dark design system. Apply frontend-design skill principles.

**Steps**:
1. Tune `defaultFill` — experiment between `#2C2C2E` and slightly lighter for better muscle visibility
2. Selected muscle color: `#4F8EF7` (primary blue) with appropriate opacity
3. Hover state: since library lacks hover API, add CSS `:hover` on SVG paths via global CSS or wrapper styles
4. Add `motion/react` fade transition on view toggle (wrap `BodyHighlighter` in `AnimatePresence`)
5. Responsive sizing: `scale` prop based on viewport, or CSS `max-w-[320px] w-full`
6. Hide `head` and `hair` slugs — irrelevant for muscle selection

**Files**: [`BodyHighlighter.tsx`](athlete-pwa/components/body-map/BodyHighlighter.tsx), [`globals.css`](athlete-pwa/app/globals.css) (add hover styles)

**Verify**: Body map looks polished. Dark theme consistent. Hover feedback visible. Responsive on mobile.

---

### Phase 5: Update Muscle Chips for New Groups

**Goal**: Add newly-available muscle groups (obliques, lower-back) to chip selector.

**Steps**:
1. Update `ALL_MUSCLE_CHIPS` in [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) — add `obliques`, `lower-back`, `adductors`
2. Update `FRONT_CHIP_IDS` / `BACK_CHIP_IDS` arrays
3. Verify DB `muscle_groups` table has these IDs — if not, add seed migration or skip them
4. Keep chip component unchanged — it already handles dynamic muscle lists

**File**: [`page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) (modify)

**Verify**: New chips appear. Clicking them queries DB correctly.

---

### Phase 6: Delete Old BodyMapSVG & Clean Up

**Goal**: Remove dead code. Final cleanup.

**Steps**:
1. Delete [`athlete-pwa/components/body-map/BodyMapSVG.tsx`](athlete-pwa/components/body-map/BodyMapSVG.tsx) — 337 lines of dead custom SVG
2. Remove any unused imports in page
3. Verify no other files reference `BodyMapSVG`
4. Run `npm run build` — confirm no type errors
5. Visual QA on mobile viewport

**Files**: Delete [`BodyMapSVG.tsx`](athlete-pwa/components/body-map/BodyMapSVG.tsx)

**Verify**: Build succeeds. No regressions.

---

### Phase 7: Polish & Edge Cases

**Goal**: Final UX polish per frontend-design skill guidelines.

**Steps**:
1. Add subtle CSS transitions on SVG path hover (if not handled by library)
2. Ensure RTL layout doesn't break body map positioning
3. Add `aria-label` or tooltip on hover showing Persian muscle name
4. Test gender toggle if needed (future: `gender="male"` default, add toggle later)
5. Verify touch targets meet 44×44px minimum on mobile
6. Add loading shimmer on body map while exercises fetch

**Files**: [`BodyHighlighter.tsx`](athlete-pwa/components/body-map/BodyHighlighter.tsx), [`globals.css`](athlete-pwa/app/globals.css)

**Verify**: Polished, production-ready body map feature.

---

## File Impact Summary

| File | Phase | Action |
|------|-------|--------|
| [`athlete-pwa/package.json`](athlete-pwa/package.json) | 0 | Add `simple-body-highlighter-react` dep |
| [`athlete-pwa/lib/body-map/muscle-mapping.ts`](athlete-pwa/lib/body-map/muscle-mapping.ts) | 1 | **Create** — slug ↔ DB mapping |
| [`athlete-pwa/components/body-map/BodyHighlighter.tsx`](athlete-pwa/components/body-map/BodyHighlighter.tsx) | 2 | **Create** — library wrapper component |
| [`athlete-pwa/app/(athlete)/body-map/page.tsx`](athlete-pwa/app/(athlete)/body-map/page.tsx) | 3, 5 | **Modify** — swap component, add chips |
| [`athlete-pwa/app/globals.css`](athlete-pwa/app/globals.css) | 4, 7 | **Modify** — hover styles, transitions |
| [`athlete-pwa/components/body-map/BodyMapSVG.tsx`](athlete-pwa/components/body-map/BodyMapSVG.tsx) | 6 | **Delete** — 337 lines removed |

**Net code change**: ~-200 lines (delete 337, add ~130 mapping + wrapper). Simpler, more maintainable.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SSR hydration mismatch (inline SVG) | Phase 0 smoke test. If fails: `dynamic(() => import(...), { ssr: false })` |
| Library slug doesn't map to DB group | `SLUG_TO_MUSCLE_GROUP` returns `null` → ignore click. `hiddenParts` hides unmapped slugs |
| Hover not supported by library | CSS `:hover` on SVG paths in `globals.css`. Phase 4 handles this |
| DB missing new muscle groups (obliques etc.) | Phase 5: skip chips for groups DB doesn't have. No migration needed |
| React 19 compatibility | Library peer dep explicitly includes `^19.0.0`. Verified in npm registry |

---

## KISS Principle Compliance

- **No over-engineering**: Thin wrapper, not a complex abstraction. Mapping module is pure data.
- **Incremental**: Each phase is 1-2 files, ~30 min work, independently verifiable.
- **Minimal state**: Remove `hoveredMuscle` state (library doesn't need it). Keep 3 states: `selectedMuscle`, `view`, `exercises`.
- **No premature features**: Gender toggle, workout logging integration, muscle engagement bars — all deferred. Focus on core: click muscle → see exercises.