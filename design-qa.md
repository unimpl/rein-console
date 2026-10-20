# Todo and task-detail verification — 2026-10-20

final result: passed

## Visual truth and evidence

- Selected direction: second displayed concept, `/Users/xhb/.codex/generated_images/01a159a8-df44-72d1-8a1f-00b08d301404/exec-8327bea5-c7a0-4c75-8323-ef5e37b3274b.png`.
- Additional source: user-provided result references in the conversation, adapted to the existing compact application typography.
- Updated editable Figma: board `2:34`, tasks `2:35`, requirements result `71:14325`, code result `71:15320`, reordered board example `78:15389` in file `pzrgKXgJAyugcvBNC16Ick`.
- Source captures: `/tmp/rein-todo-review/figma-board.png`, `/tmp/rein-todo-review/figma-results.png`.
- Browser-rendered implementation: `/tmp/rein-todo-review/board.png`, `/tmp/rein-todo-review/tasks.png`, `/tmp/rein-todo-review/results.png`.
- Source and implementation: 1600 × 900 pixels, viewport 1600 × 900 CSS pixels, density 1. No normalization required. The selected concept is a direction reference; updated Figma provides the matching viewport.
- Board source/implementation and results source/implementation were inspected together in the same paired comparison input. Full-size result panels make labels and icons readable; no extra crop was needed.

## Findings

No actionable P0/P1/P2 visual findings remain within the requested scope.

- Typography: existing Inter / Noto Sans SC hierarchy retained, with compact 11–14 px result copy and normal completed-step text. No completed-step strike-through.
- Layout and rhythm: white columns, thin vertical separators, compact cards, original pane controls retained. The drawer follows the existing measured title edge / saved width; Figma's 640 px reference and the browser's dynamic width intentionally differ. Result rows align icons, titles, metadata and chevrons; expanded text wraps within the panel.
- Colors: no full-column purple/blue/green washes. Status dots, selected cards and waiting highlights retain their meanings. Completed Spec icons are green. Completed result badge is pale green.
- Assets: existing provider and interface SVGs retained; result icons use the same Lucide source as the Figma nodes. No rasterized UI, approximate brand assets or temporary asset URLs in runtime code.
- Copy: Task replaces Activity; the execution summary and four artifact groups follow the supplied reference. Simulated document/PR/test data is identified, with no invented live repository destination.

## Behavior verification

23 end-to-end tests passed. New coverage checks native drag sorting, cross-column status updates, running and waiting session locks, stopping before moving, outside-click dismissal, document dialogs, expandable result groups and existing dependency routing. Existing tests check responsive panes, keyboard resizing, narrow windows, console errors and local asset loading. After the final document-close rendering fix, both new end-to-end flows passed again. Production build, TypeScript and lint passed.

## Comparison history

1. Full-view source/implementation inspection found no substantive visual drift. Existing out-of-scope chat line wrapping differs slightly and was preserved.
2. Interaction review found a closing document dialog could momentarily display the fallback PR title. The document selection is now retained separately from its open state; the document flows were rerun successfully.

## Implementation checklist

- [x] White board and separators.
- [x] Idle task reorder / cross-column moves, with session locks enforced in the service.
- [x] Dependency paths update after ordering and status changes.
- [x] Outside-click dismissal without closing portaled document dialogs.
- [x] Task tab, normal completed text and green completion icons.
- [x] Expandable result artifacts and complete document views.
- [x] Updated Figma result states and reorder example.

## Follow-up polish

No additional polish is required for this request. Data and order remain in-memory, consistent with the existing demonstration adapter; real Agent/PR/test integration is outside this change.
