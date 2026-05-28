<?php

namespace App\Training;

use App\Models\AthleteProfile;
use App\Models\AvailabilityRule;
use App\Models\RaceGoal;
use App\Models\TrainingPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StoredTrainingPlanCreator
{
    public function __construct(private readonly TrainingPlanPreviewGenerator $generator) {}

    public function create(User $user, TrainingPlanInput $input): TrainingPlan
    {
        return DB::transaction(function () use ($user, $input): TrainingPlan {
            AthleteProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'experience_level' => $input->level,
                    'current_weekly_distance_km' => $input->currentWeeklyDistanceKm,
                ],
            );

            AvailabilityRule::create([
                'user_id' => $user->id,
                'available_weekdays' => $input->availableWeekdays,
                'long_run_weekday' => $input->longRunWeekday,
            ]);

            $raceGoal = RaceGoal::create([
                'user_id' => $user->id,
                'race_distance' => $input->raceDistance,
                'race_date' => $input->raceDate,
                'status' => 'active',
            ]);

            $preview = $this->generator->generate($input);

            $plan = TrainingPlan::create([
                'user_id' => $user->id,
                'race_goal_id' => $raceGoal->id,
                'status' => 'active',
                'level' => $input->level,
                'starts_on' => $input->startDate,
                'ends_on' => $input->raceDate,
                'source_context' => [
                    'generator' => 'deterministic_v1',
                    'race_distance' => $input->raceDistance,
                    'current_weekly_distance_km' => $input->currentWeeklyDistanceKm,
                    'available_weekdays' => $input->availableWeekdays,
                    'long_run_weekday' => $input->longRunWeekday,
                ],
            ]);

            $plan->revisions()->create([
                'reason' => 'initial_generation',
                'summary' => 'Initial plan generated from goal date, distance, availability, and current weekly distance.',
                'changes' => ['weeks' => count($preview['weeks'])],
            ]);

            foreach ($preview['weeks'] as $week) {
                foreach ($week['workouts'] as $workout) {
                    $plan->workouts()->create([
                        'week_number' => $week['week'],
                        'scheduled_on' => $workout['date'],
                        'type' => $workout['type'],
                        'status' => 'planned',
                        'target_distance_km' => $workout['target_distance_km'],
                        'target_intensity' => $workout['intensity'],
                        'note' => $workout['note'],
                    ]);
                }
            }

            return $plan->load(['raceGoal', 'revisions', 'workouts' => fn ($query) => $query->orderBy('scheduled_on')]);
        });
    }
}

