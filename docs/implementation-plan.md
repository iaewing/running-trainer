# Running Trainer Implementation Plan

## Product Goal

Build a mobile-first adaptive running training app in the spirit of Runna, Coopah, and Kotcha, initially for personal use with a possible path to indie SaaS.

V1 focuses on helping a runner choose a 10K or half-marathon race, configure available training days, receive a practical training plan, log completed effort quickly, and have future planned runs adapt to real life.

## Repository Decision

Use a monorepo.

This is the better default for V1 because the mobile app, API, plan engine, and integration contracts will change together. A monorepo keeps domain model changes, migrations, API contracts, and mobile screens in one reviewable history. Separate repos would add coordination overhead before the product has enough team/process complexity to justify it.

Revisit separate repos only if the API becomes a standalone product, multiple independent teams own the surfaces, or release/security boundaries become meaningfully different.

## V1 Scope

- iOS only.
- React Native mobile app.
- Laravel API backend.
- 10K and half-marathon plans only.
- Manual logging as a first-class workflow.
- HealthKit import for iOS workout data.
- Optional Strava import after core logging is useful.
- Provider-neutral integration model for later COROS, Garmin, and Suunto support.

Android and Health Connect are explicitly out of V1.

## Initial User Capabilities

- Create an athlete profile.
- Choose goal distance: 10K or half marathon.
- Choose goal date.
- Optionally set target finish time.
- Enter recent running baseline:
  - current weekly mileage
  - longest recent run
  - recent race result, if available
  - injury concerns
- Configure available training days.
- Choose preferred long-run day.
- Add unavailable dates.
- Generate a plan.
- View plan by week.
- Log a run in under 20 seconds.
- Mark workouts completed, shortened, skipped, replaced, sick, travel-affected, or injury-affected.
- See simple explanations when the plan changes.

## Training Plan Principles

Use principles from established public running systems without copying proprietary paid plans.

Useful references:

- Hal Higdon-style accessibility, progressive long runs, clear beginner/intermediate tracks, public free plans as benchmarks where reuse rights allow.
- Pfitzinger-style emphasis on aerobic support, medium-long work, specific endurance, and thoughtful tapering.
- Daniels/VDOT-style intensity zones and race-equivalent pacing.
- Hansons-style cumulative fatigue ideas as a later advanced option, not V1 default.

The plan engine should be deterministic. AI may assist explanation and note parsing, but should not be the authority that decides training load.

## Plan Engine V1

Inputs:

- goal distance
- goal date
- current date
- available training days
- preferred long-run day
- current weekly distance
- longest recent run
- target time, if provided
- athlete level
- recent logs
- life events

Outputs:

- weekly plan
- scheduled workouts
- workout steps for structured sessions
- planned distance or duration
- intensity target using RPE first, pace later
- plan revision explanations

Workout types:

- rest
- easy
- recovery
- long run
- strides
- tempo
- intervals
- race pace
- tune-up race or time trial

Safety constraints:

- Do not automatically cram missed runs into later days.
- Preserve recovery spacing around hard workouts.
- Avoid abrupt weekly load increases.
- Prefer reducing intensity before removing all running.
- Treat illness/injury as rebuild scenarios, not schedule optimization problems.
- Keep race week conservative.

## Adaptation Rules

Initial adaptation should be rule-based and understandable.

Missed easy run:

- Usually skip it.
- Do not increase the next run to compensate.

Missed long run:

- Move within the same week only if recovery spacing remains acceptable.
- Otherwise reduce the next long run or hold progression steady.

Shortened workout:

- If effort was high, reduce the next hard session.
- If effort was low and reason was logistical, preserve the next key session.

High RPE or soreness:

- Downgrade upcoming intensity.
- Add recovery run or rest if repeated.

Illness:

- Replace immediate training with rest or short easy runs.
- Resume with a reduced-load bridge.
- Avoid hard workouts until symptoms are resolved and easy running is tolerated.

Travel/life event:

- Use available days.
- Preserve long run or one key workout where safe.
- Drop secondary work first.

## Integrations

Implement imports before exports.

V1 providers:

- `manual`
- `healthkit`
- `strava` after HealthKit/manual flow is useful
- `file_import` as V1.5 fallback for `.fit`, `.tcx`, and `.gpx`

Future providers:

- `coros`
- `garmin`
- `suunto`

Provider capabilities should be data-driven so future support does not require changing core plan logic.

Example capabilities:

- imports completed activities
- exports structured workouts
- exports calendar assignments
- exports full training plans
- supports workout deletion
- supports workout updates
- supports webhooks

## Integration Notes

HealthKit is the primary V1 iOS import path.

Strava is valuable because it can bridge many devices before direct watch-vendor partnerships exist.

COROS, Garmin, and Suunto should be treated as partner/API-dependent integrations. The app should be architected for them, but launch should not depend on API approval.

Garmin has a Training API for publishing workouts and training plans to Garmin Connect calendars for compatible-device sync, but access is via the Garmin Connect Developer Program.

Suunto has partner APIs and SuuntoPlus Guide mechanisms that may support future structured workout delivery.

COROS has third-party training-plan integrations and an API application process.

## AI Usage

Use AI where it improves UX but does not create unsafe hidden behavior.

Good V1/V1.5 uses:

- Parse free-text run notes into structured signals.
- Explain why a plan changed.
- Summarize week-over-week training.
- Draft user-facing workout purpose text.
- Suggest plan adjustments for deterministic validation.

Avoid:

- Medical diagnosis.
- Unbounded plan generation.
- Copying proprietary plan tables.
- Hidden changes without explanation.

## Backend Architecture

Use Laravel with PostgreSQL and Redis queues.

Core backend modules:

- auth
- athlete profile
- race goals
- availability
- plan generation
- workout calendar
- activity logging
- plan adaptation
- integrations
- AI assistance

Initial tables:

- `users`
- `athlete_profiles`
- `race_goals`
- `availability_rules`
- `training_plans`
- `plan_revisions`
- `workouts`
- `workout_steps`
- `activity_logs`
- `readiness_logs`
- `life_events`
- `integration_connections`
- `external_activities`
- `activity_imports`
- `workout_exports`
- `provider_capabilities`
- `sync_jobs`

## Mobile Architecture

Use React Native with TypeScript.

Recommended app areas:

- onboarding
- plan calendar
- workout detail
- run logging
- history
- settings
- integrations

State/data:

- server state through query hooks
- local form state per screen
- offline-friendly logging as a later improvement

iOS native capability:

- HealthKit access
- background refresh/import later if needed
- push/local notifications later

## Initial Milestones

### Milestone 1: Skeleton

- Monorepo structure.
- Laravel API scaffold.
- React Native iOS scaffold.
- Basic documentation.
- Local dev instructions.

### Milestone 2: Domain Foundation

- Athlete profile model.
- Race goal model.
- Availability model.
- Training plan and workout schema.
- Seed sample profile/goal.

### Milestone 3: Plan Generation

- Generate 10K plan.
- Generate half-marathon plan.
- Beginner/intermediate selection.
- Calendar API.
- Mobile calendar display.

### Milestone 4: Logging and Adaptation

- Manual run logging.
- Match logged runs to planned workouts.
- Missed/shortened/skipped handling.
- Plan revision explanations.

### Milestone 5: HealthKit Import

- Request HealthKit permissions.
- Read running workouts.
- Import and deduplicate activities.
- Link imported activities to planned workouts.

### Milestone 6: Polish for Personal Use

- Weekly summaries.
- Plan change audit trail.
- Simple readiness inputs.
- Better workout descriptions.

### Milestone 7: SaaS Readiness

- Subscription boundary.
- Account export/delete.
- Privacy policy and data retention.
- Integration reliability reporting.
- Licensing review for any plan-derived content.

## Open Product Questions

- Should plans be distance-based, duration-based, or user-selectable in V1?
- Should target time be hidden until the user has enough baseline data?
- Should the app support only one active race goal in V1?
- How conservative should illness recovery be by default?
- Which provider should follow HealthKit: Strava import, file import, or calendar export?
