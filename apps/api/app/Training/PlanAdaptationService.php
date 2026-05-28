<?php

namespace App\Training;

use App\Models\ActivityLog;
use App\Models\TrainingPlan;
use App\Models\Workout;

class PlanAdaptationService
{
    public function adaptAfter(ActivityLog $activityLog): void
    {
        if (! $activityLog->workout) {
            return;
        }

        $workout = $activityLog->workout()->with('trainingPlan')->firstOrFail();
        $plan = $workout->trainingPlan;

        if ($activityLog->completion_status === 'skipped') {
            $this->protectNextWorkout(
                plan: $plan,
                afterWorkout: $workout,
                reason: 'missed_workout',
                summary: 'The next quality workout was reduced after a skipped run.',
            );

            return;
        }

        if ($activityLog->completion_status === 'shortened') {
            $this->protectNextWorkout(
                plan: $plan,
                afterWorkout: $workout,
                reason: 'shortened_workout',
                summary: 'The next quality workout was reduced after a shortened run.',
            );

            return;
        }

        if ($activityLog->effort_rpe !== null && $activityLog->effort_rpe >= 8) {
            $this->protectNextWorkout(
                plan: $plan,
                afterWorkout: $workout,
                reason: 'high_effort',
                summary: 'The next quality workout was reduced after a high-effort log.',
            );
        }
    }

    private function protectNextWorkout(TrainingPlan $plan, Workout $afterWorkout, string $reason, string $summary): void
    {
        $nextWorkout = $plan->workouts()
            ->where('scheduled_on', '>', $afterWorkout->scheduled_on)
            ->where('status', 'planned')
            ->whereIn('type', ['tempo', 'intervals', 'race_pace', 'long_run'])
            ->where('type', '!=', 'race')
            ->orderBy('scheduled_on')
            ->first();

        if (! $nextWorkout) {
            return;
        }

        $before = [
            'workout_id' => $nextWorkout->id,
            'type' => $nextWorkout->type,
            'target_distance_km' => $nextWorkout->target_distance_km,
            'target_intensity' => $nextWorkout->target_intensity,
        ];

        $nextWorkout->update([
            'type' => $nextWorkout->type === 'long_run' ? 'easy' : 'recovery',
            'target_distance_km' => $this->reducedDistance($nextWorkout),
            'target_intensity' => 'very_easy',
            'note' => $this->adaptedNote($nextWorkout),
        ]);

        $plan->revisions()->create([
            'reason' => $reason,
            'summary' => $summary,
            'changes' => [
                'adapted_workout_id' => $nextWorkout->id,
                'before' => $before,
                'after' => [
                    'workout_id' => $nextWorkout->id,
                    'type' => $nextWorkout->type,
                    'target_distance_km' => $nextWorkout->target_distance_km,
                    'target_intensity' => $nextWorkout->target_intensity,
                ],
            ],
        ]);
    }

    private function reducedDistance(Workout $workout): ?float
    {
        if ($workout->target_distance_km === null) {
            return null;
        }

        return round(max(3.0, $workout->target_distance_km * 0.75), 1);
    }

    private function adaptedNote(Workout $workout): string
    {
        $baseNote = $workout->note ? "{$workout->note} " : '';

        return $baseNote.'Adjusted to protect recovery after the last logged run.';
    }
}

