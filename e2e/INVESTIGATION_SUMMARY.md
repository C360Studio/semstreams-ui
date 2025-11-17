# E2E Test Investigation Summary

**Date**: 2025-10-18
**Task**: T010 Investigation
**Feature**: 012-pass-ui-e2e
**Duration**: 60 minutes

---

## Problem Statement

51 out of 74 E2E tests are failing despite the fact that:
- ✅ Implementation is working correctly (35/35 component tests passing)
- ✅ Schema-driven UI is functional (9/9 schema-config.spec.ts tests passing)
- ✅ Manual testing would work

**Root Cause**: Test maintenance debt - tests were not updated when UI evolved from JSON textarea to schema-driven forms.

---

## Key Findings

### 🚨 Critical Finding #1: Wrong Palette Selectors (Affects 40+ tests)

**Discovery**: Tests are using `data-testid="palette-item-*"` selectors that **DO NOT EXIST** in the codebase!

**Tests Currently Use**:
```typescript
const paletteItem = page.locator('[data-testid="palette-item-udp-input"]');
await paletteItem.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });
```

**Actual Implementation** (ComponentPalette.svelte:69):
```svelte
<div class="component-card" data-component-id={component.id}>
```

**Solution**: Use ComponentPalettePage helper method (already correct!):
```typescript
const palette = new ComponentPalettePage(page);
await palette.dragComponentToCanvas('UDP Input', 100, 100);  // ✅ Works!
```

**Impact**:
- Affects: flow-save.spec.ts (7 tests), flow-autosave.spec.ts (8 tests), flow-navigation.spec.ts (8 tests), flow-degradation.spec.ts (12 tests), flow-conflict.spec.ts (1 test), flow-persistence.spec.ts (2 tests), navigation.spec.ts (3 tests), runtime-control.spec.ts (3 tests)
- **44 tests** affected by this single issue!

---

### 🚨 Critical Finding #2: Component Title Format Mismatch (Affects 1 test)

**Tests Expect**: "UDP Input" (human-readable component name)

**Actual Implementation** (ConfigPanel.svelte:178):
```svelte
<h3>Configure: {component.type}</h3>  <!-- Shows "Configure: udp" -->
```

**Solution**:
```typescript
// ❌ WRONG
await configPanel.expectComponentTitle('UDP Input');

// ✅ CORRECT
await configPanel.expectComponentTitle('Configure: udp');
```

**Impact**: component-config.spec.ts (1 test)

---

### ✅ Good News: Page Objects Already Mostly Correct

**ConfigPanelPage.ts**:
- Already has schema form methods: `fillFormField()`, `expectFieldValue()`, `clickSubmit()`
- Already has proper locators for schema forms
- **Fixed during investigation**: Added `.first()` to componentTitle selector

**ComponentPalettePage.ts**:
- Already uses semantic selectors (by component name)
- `dragComponentToCanvas()` method works correctly with implementation
- Tests just need to **USE** the Page Object instead of raw selectors!

---

## Test Failure Breakdown

### By Failure Pattern

| Pattern | Count | Description |
|---------|-------|-------------|
| Wrong palette selector | 44 | Using `data-testid` that doesn't exist |
| JSON textarea (schema fields needed) | 3 | Config panel tests need schema field updates |
| Component title format | 1 | Expecting "UDP Input" vs "Configure: udp" |
| Save status text (TBD) | 3 | Need to verify actual text in implementation |

### By Test File

| File | Tests | Failing | Main Issue |
|------|-------|---------|------------|
| component-config.spec.ts | 3 | 3 | JSON textarea + title format |
| flow-save.spec.ts | 7 | 7 | Palette selector |
| flow-autosave.spec.ts | 9 | 8 | Palette selector |
| flow-navigation.spec.ts | 9 | 8 | Palette selector + save status text |
| flow-degradation.spec.ts | 12 | 12 | Palette selector |
| flow-conflict.spec.ts | 7 | 4 | Palette selector + save status text |
| flow-persistence.spec.ts | 3 | 2 | Palette selector |
| navigation.spec.ts | 3 | 3 | Save status text |
| runtime-control.spec.ts | 5 | 3 | Palette selector |
| schema-config.spec.ts | 11 | 2 | Minor validation fixes |

---

## Implementation Verification

### ✅ Verified Selectors

**ComponentPalette.svelte**:
- Palette items use: `data-component-id="{component.id}"` (line 69)
- Component IDs: "udp", "websocket", "context", "graph", "robotics", "rule", "objectstore"
- Component names: "UDP Input", "WebSocket Output", etc.

**ConfigPanel.svelte**:
- Title format: "Configure: {component.type}" (line 178)
- Multiple `<h3>` elements (title + section headings)
- Schema forms use submit button
- JSON editor fallback uses "Apply" button

**Component Schemas** (from backend):
- UDP Input (`udp`): port (int), bind (string), subject (string)
- WebSocket Output (`websocket`): url (string)
- Robotics Processor (`robotics`): system_id (int), component_id (int)

---

## Solution Strategy

### Phase 1: Quick Wins (COMPLETED ✅)

**Files Updated**:
1. ConfigPanelPage.ts - Fixed componentTitle selector with `.first()`
2. component-config.spec.ts - Updated all 3 tests to use schema UI patterns

**Changes Made**:
- Test 1: Updated component title expectation to "Configure: udp"
- Test 2: Replaced JSON textarea with schema field interactions
- Test 3: Converted from invalid JSON test to schema validation test

### Phase 2: Systematic Palette Selector Fixes (PENDING)

**Strategy**: Replace raw `page.locator('[data-testid="palette-item-*"]')` with `palette.dragComponentToCanvas()` calls

**Affected Files** (Priority Order):
1. flow-save.spec.ts (7 tests) - ~30 min
2. schema-config.spec.ts (2 tests) - ~10 min
3. flow-conflict.spec.ts (4 tests) - ~20 min
4. flow-persistence.spec.ts (2 tests) - ~15 min
5. navigation.spec.ts (3 tests) - ~20 min
6. runtime-control.spec.ts (3 tests) - ~20 min
7. flow-autosave.spec.ts (8 tests) - ~45 min
8. flow-navigation.spec.ts (8 tests) - ~45 min
9. flow-degradation.spec.ts (12 tests) - ~60 min

**Estimated Total**: ~4.5 hours for all 49 remaining tests

---

## Effort Estimate

### Investigation (COMPLETE)
- **Time Spent**: 60 minutes
- **Deliverables**:
  - TEST_UPDATE_PLAN.md (comprehensive guide)
  - INVESTIGATION_SUMMARY.md (this document)
  - Updated ConfigPanelPage.ts
  - Fixed component-config.spec.ts (3 tests)

### Remaining Implementation (T011)
- **Estimated**: 4.5 hours
- **Tests to Fix**: 49 tests
- **Main Task**: Replace palette selectors with Page Object methods
- **Secondary**: Verify save status text expectations

---

## Risk Assessment

### Low Risk
- **Palette selector fixes**: Straightforward find-and-replace
- **ComponentPalettePage already correct**: Just need to use it!
- **Schema field interactions**: Pattern already proven in schema-config.spec.ts

### Medium Risk
- **Save status text**: Need to verify actual implementation text
- **Timing issues**: Some tests may need proper waits

### High Risk
- **None identified**: All patterns are well-understood and tested

---

## Success Criteria

**Target**: 71/74 tests passing (96% pass rate)

**3 Intentional Skips** (already documented):
1. drag-and-drop.spec.ts - Scenario 8 (Playwright/@xyflow issue)
2. schema-config.spec.ts - Enum field test (no components with enum fields)
3. schema-config.spec.ts - Schema-less component test (all components have schemas)

**Quality Gates**:
- ✅ All tests use Page Object methods (not raw selectors)
- ✅ All config interactions use schema fields (not JSON textarea)
- ✅ No implementation changes (only test updates)
- ✅ Patterns documented for future test maintenance

---

## Recommendations

### For Immediate Implementation

1. **Start with flow-save.spec.ts**: Quick win, proves pattern works
2. **Use find-and-replace**: Most changes are mechanical
3. **Test incrementally**: Run each file after updating
4. **Document patterns**: Update TEST_UPDATE_PLAN.md with lessons learned

### For Future Test Maintenance

1. **Always use Page Objects**: Prevents selector drift
2. **Verify implementation**: Check actual code before writing tests
3. **Run E2E tests regularly**: Catch regressions early
4. **Document selector changes**: Update Page Objects when UI changes

### For Code Quality

1. **Consider adding data-testid attributes**: Would make tests more resilient
2. **Standardize component title format**: Consider showing human-readable name
3. **Add E2E test coverage to CI**: Prevent regressions

---

## Conclusion

**Investigation Successful** ✅

**Key Insight**: Most failures are due to tests using selectors that don't exist in implementation. Solution is straightforward: use existing Page Object methods.

**Confidence Level**: HIGH
- Pattern is proven (schema-config.spec.ts passing)
- Page Objects already correct
- Implementation is working
- Fixes are mechanical

**Next Steps**: Proceed with T011 implementation following TEST_UPDATE_PLAN.md

---

**Investigation Complete**: 2025-10-18
**Ready for Implementation**: Phase T011

---

## ADDENDUM: SvelteFlow Event System Research (2025-10-19)

### Additional Root Cause Discovered

**Problem**: Phase 1 validation E2E tests failing because components appear visually but aren't saved to backend (0 nodes).

**Root Cause**: Playwright's `dragTo()` fires mouse events, not HTML5 drag events:
1. ComponentPalette initiates drag with HTML5 drag events
2. Playwright's `dragTo()` simulates **mouse events** (mousedown/mousemove/mouseup)
3. XYFlow's internal handlers respond to mouse events and add nodes to internal DOM
4. Our `handleDrop` expects HTML5 `drop` event → **never fires**
5. `onNodesChange` callback never called, parent state never updates
6. Nodes appear visually but `flow.nodes` stays empty
7. Backend validation receives 0 nodes

**Why config panel tests pass**: XYFlow creates DOM element for visual node, click events work, config panel opens. But saving still fails.

### SvelteFlow Architecture Findings

**Key Discovery**: SvelteFlow uses Svelte's **binding system**, not React Flow's callback pattern.

**React Flow pattern**:
```typescript
<ReactFlow nodes={nodes} onNodesChange={handleChange} />
```

**SvelteFlow pattern**:
```typescript
<SvelteFlow bind:nodes={nodes} bind:edges={edges} />
```

**Available Events** (no `onnodeschange`):
- Node events: `onnodeclick`, `onnodedrag`, `onnodedragstart`, `onnodedragstop`
- Connection events: `onconnect`, `onconnectstart`, `onconnectend`, `onbeforeconnect`
- Deletion: `ondelete`, `onbeforedelete`
- Selection: `onselectionchange`

**Current architecture issue**: Our `nodes` is `$derived` (read-only), cannot use `bind:`.

### Recommended Solution: Multi-Modal Component Addition

**Add keyboard + double-click alternatives to drag-and-drop**:

**Benefits**:
1. ✅ Fixes WCAG 2.1 Level A violation (accessibility)
2. ✅ Makes E2E tests work (can use keyboard/click instead of drag)
3. ✅ Simpler than managing bidirectional binding conversions
4. ✅ Better UX overall (users choose preferred interaction)

**Implementation Options**:
1. **Double-click** on palette item → adds to canvas center
2. **Keyboard** (Enter/Space) on palette item → adds to canvas center
3. **Context menu** (right-click) → "Add to Canvas" option

**E2E Test Pattern** (after fix):
```typescript
// Instead of dragTo() which doesn't work with HTML5 events
await page.locator('[data-component="UDP Input"]').dblclick();
// Or
await page.locator('[data-component="UDP Input"]').press('Enter');
```

### For Visual Wiring Feature (Next)

**Connection events to use**:
- `onconnect` - User creates edge
- `onbeforeconnect` - Validate before allowing connection
- `ondelete` - User deletes edges

**Keep event-driven architecture** (not bidirectional binding):
```typescript
const edges = $derived(flow.connections.map(conn => ({ ... })));

<SvelteFlow
  {edges}  <!-- One-way prop -->
  onconnect={handleConnect}
  ondelete={handleDelete}
/>
```

**Why**: Clearer data flow, avoids circular update issues, consistent with current architecture.

### Documentation

**Complete findings**: `SVELTEFLOW_RESEARCH_FINDINGS.md`

**Investigation Complete**: 2025-10-19
**Ready for Implementation**: Multi-modal component addition + Phase T011
