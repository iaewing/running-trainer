# Project Status

## 2026-05-27

Completed:

- Initialized the repository as a monorepo.
- Added product and implementation plan documentation.
- Scaffolded Laravel API in `apps/api`.
- Scaffolded React Native mobile app in `apps/mobile`.
- Installed iOS CocoaPods dependencies.
- Added a first deterministic API slice:
  - `GET /api/v1/health`
  - `POST /api/v1/training-plan-preview`
- Replaced the generated React Native welcome screen with a V1 planner surface.
- Added core training domain schema and models:
  - athlete profiles
  - race goals
  - availability rules
  - training plans
  - plan revisions
  - workouts and workout steps
  - activity logs
  - readiness logs
  - life events
  - integration connection/export/import support tables
- Added stored plan generation:
  - `POST /api/v1/training-plans`
- Added stored plan retrieval:
  - `GET /api/v1/training-plans?user_id={id}`
  - `GET /api/v1/training-plans/{id}?user_id={id}`
  - returns race goal, workouts, revisions, and source context
- Added local athlete bootstrap:
  - `POST /api/v1/athlete-bootstrap`
  - creates/reuses a temporary local runner until auth/onboarding exists
- Added manual activity logging:
  - `POST /api/v1/activity-logs`
  - supports planned-workout logs and unplanned manual runs
  - updates linked workout status from completion status
- Added initial adaptation rules:
  - high-effort logs reduce the next planned quality workout
  - skipped logs reduce the next planned quality workout
  - shortened logs use the same recovery-protection path
  - adaptations create plan revisions for explainability
- Connected the mobile planner save flow to the API:
  - creates/reuses the local runner
  - saves the current goal, availability, and weekly distance
  - displays the saved plan id and workout count
- Added mobile saved-plan viewing:
  - fetches the stored plan after save
  - loads the latest saved plan for the local runner on demand
  - displays plan dates, workout count, user id, and first scheduled workouts
  - shows workout date, type, status, week number, intensity, and distance
- Added mobile quick run logging:
  - select a workout from the saved plan
  - enter distance and effort
  - choose completed, shortened, skipped, or replaced
  - submit to `POST /api/v1/activity-logs`
  - refreshes the saved plan so workout status and adaptations are visible

Verified:

- API tests pass: 16 tests, 70 assertions.
- Mobile render test passes.
- Mobile lint passes.
- Xcode can list the generated iOS workspace and `RunningTrainerMobile` scheme.

Notes:

- Android files exist because the standard React Native template generated them. Android remains out of V1 scope.
- COROS, Garmin, and Suunto are future provider adapters, not launch blockers.
