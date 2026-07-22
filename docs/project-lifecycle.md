# Project Lifecycle & Status Tracking

## Overview
In the RenderVideo application, the lifecycle of a project is complex because a single project can be rendered multiple times, resulting in multiple `render_jobs` and potentially multiple `project_outputs`. 

To maintain strict consistency across all surfaces (User Dashboard, Admin Dashboard, Analytics, API), we do NOT rely on the `projects.status` column, as synchronizing it from external worker processes introduces race conditions.

Instead, we use a single source of truth: the PostgreSQL view **`vw_project_lifecycle_status`**.

## Source of Truth
The `vw_project_lifecycle_status` view calculates the true status of a project dynamically by aggregating data from:
- `projects`
- `render_jobs`
- `project_outputs`

This view is optimized with composite indexes and is designed to be upgraded to a `MATERIALIZED VIEW` as the dataset grows.

## Priority Rules & Transitions
A project's state is evaluated using a strict priority ladder. The first condition that matches determines the project's `lifecycle_status`.

| Priority | Status | Definition | Transition Trigger |
| :--- | :--- | :--- | :--- |
| **1** | `ARCHIVED` | The project has been explicitly archived by the user. | `projects.status = 'archived'` |
| **2** | `RENDERING` | The project currently has an active render job. | Exists `render_jobs` where status is `pending`, `processing`, or `running` |
| **3** | `COMPLETED` | The project has successfully produced at least one final output. | Exists `project_outputs` where status = `completed` |
| **4** | `FAILED` | The project has no successful outputs, and the most recent render attempt failed. | Exists `render_jobs` where status = `failed` (and priority 3 is false) |
| **5** | `DRAFT` | The project has never been rendered. | Catch-all fallback. |

> **Note:** Because `RENDERING` has a higher priority than `COMPLETED`, if a user successfully renders a video (`COMPLETED`), and then triggers a second render, the dashboard will immediately show `RENDERING` again until that job finishes.

## Centralized Enum
To avoid hardcoded strings across the stack, the database enforces the `project_lifecycle_state` ENUM type:
```sql
CREATE TYPE public.project_lifecycle_state AS ENUM (
  'DRAFT', 'RENDERING', 'COMPLETED', 'FAILED', 'ARCHIVED'
);
```

## Dashboard Statistics (RPC)
Do not write custom SQL/JS filters to count Drafts or Completed projects. All application dashboards must use the shared RPC:

```sql
SELECT * FROM get_user_project_statistics('user-uuid');
```

This returns a standardized JSON object:
```json
{
  "summary": {
    "total": 20,
    "draft": 4,
    "rendering": 2,
    "completed": 13,
    "failed": 1,
    "archived": 0
  },
  "metrics": {
    "completed_percentage": 65.00,
    "total_outputs": 15,
    "successful_outputs": 13,
    "failed_outputs": 2,
    "last_render_at": "2026-07-20T...",
    "last_completed_at": "2026-07-20T...",
    "last_project_created_at": "2026-07-20T..."
  }
}
```

## Recent Projects & Metadata
The `vw_project_lifecycle_status` view also returns pre-aggregated metadata for UI rendering (e.g., "Recent Projects" feeds):
- `last_render_at`: The timestamp of the last render job.
- `last_completed_at`: The timestamp of the last successful output.
- `last_successful_output_id`: Direct ID to the latest output.
- `thumbnail_url`: The URL (from `output_url`) of the latest successful output.
- `current_progress`: Progress percentage of the active render job.
