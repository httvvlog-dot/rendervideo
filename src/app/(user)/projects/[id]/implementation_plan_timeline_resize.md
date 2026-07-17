# Sprint X — Video Timeline Resize Implementation Plan

This document outlines the approach for adding manual duration resizing to the Video Track in the User Timeline Editor.

## Proposed Changes

### 1. Local State & Undo/Redo Engine
- Modify `TimelineEditor` to maintain a local `localScenes` state instead of depending entirely on `previewScenes` derived from props.
- Implement a `history` array and `historyIndex` for Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z) functionality.
- Changes made via dragging or typing will push a new state to the history stack.
- To persist changes, a debounced auto-save or an explicit save on drag-end will call a Supabase RPC to update the `project_scenes` table.

### 2. Timeline Resizing Interactions
- **Visuals:** The timeline container currently uses flex layout with percentage widths. We will keep this approach; dragging will recalculate percentages dynamically.
- **Handles:** Add drag handles (`ew-resize` cursor) to the right (and left) edges of the active video scene block.
- **Ripple vs Roll Edit:**
  - *Right Handle:* Dragging changes the duration of the selected scene. All subsequent scenes shift left/right (Ripple edit).
  - *Left Handle:* Dragging changes the duration of the selected scene. Due to the "no gaps" rule, shrinking a scene from the left would technically shift its right edge, which feels unnatural. **We propose** that dragging the left edge of Scene B performs a "Roll Edit" (increases Scene A's duration while decreasing Scene B's duration) so the mouse cursor stays pinned to the edit point. If you prefer Ripple for both, let me know.
- **Real-time Feedback:** While dragging, display the live duration in the scene block (e.g., `7.2s`).

### 3. Voice Track (Read-Only)
- Ensure the Voice Track blocks are explicitly styled as immutable (no drag handles).
- Visual durations on the Voice Track will update their percentage widths purely as a consequence of the total video duration changing, but their absolute `durationMs` will remain fixed.

### 4. Property Panel
- When a video scene is clicked (`selectedId`), display a subtle context panel (e.g., floating above the scene or below the tracks).
- Include an input field: `Duration [ 8.00 ] s`.
- Hitting `Enter` will immediately apply the new duration, shift subsequent scenes, and push to the Undo stack.

### 5. Constraints & Visual Warning
- **Min Duration:** Enforce a hard limit of `1000ms` (1s) during drag and manual input.
- **Warning:** Calculate the total video duration for each `section_id` and compare it to the Voice duration of that section.
- If `SectionVideoDuration < SectionVoiceDuration`, apply a subtle yellow border `ring-2 ring-yellow-400` to the scenes in that section, with a tooltip: *"Video ends before narration"*.

### 6. Persistence & Scope
- Trigger a Supabase update `replace_project_timeline` or a targeted scene update function on drag-end or via a debounced save.
- All operations happen locally first to guarantee 60fps rendering.

## User Review Required

> [!WARNING]
> **Left Handle Behavior (Ripple vs Roll)**
> If we strictly enforce "No Gaps", dragging the **Left Handle** of Scene B to the right (to shrink it) will cause Scene B to shrink, and Scene C to pull left. The physical pixel you are clicking on won't move, but the block will shrink from the right. This feels very weird for users. 
> 
> **My recommendation:** 
> - **Right Handle:** Ripple Edit (Changes Scene B duration, shifts everything after it).
> - **Left Handle:** Roll Edit (Changes Scene A and Scene B duration simultaneously so the cut point moves with your mouse).
> 
> Should I implement this recommendation, or do you want both handles to just perform a standard Ripple (change current scene duration only)?

> [!IMPORTANT]
> **Save Mechanism**
> Should the new durations save automatically to the database instantly when you let go of the mouse (on drop), or do you want an explicit "Save Timeline" button? (Auto-save on drop is recommended for modern UX).

Once you approve the plan and answer the open questions, I will begin execution!
