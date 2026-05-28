<?php

namespace App\Http\Controllers;

use App\Models\TrainingPlan;
use App\Models\User;
use App\Training\StoredTrainingPlanCreator;
use App\Training\TrainingPlanInput;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TrainingPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $plans = TrainingPlan::query()
            ->with(['raceGoal', 'revisions', 'workouts' => fn ($query) => $query->orderBy('scheduled_on')])
            ->where('user_id', $validated['user_id'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $plans->map(fn (TrainingPlan $plan): array => $this->serializePlan($plan))->all(),
        ]);
    }

    public function store(Request $request, StoredTrainingPlanCreator $creator): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'race_distance' => ['required', Rule::in(['10k', 'half_marathon'])],
            'race_date' => ['required', 'date'],
            'start_date' => ['nullable', 'date'],
            'available_weekdays' => ['required', 'array', 'min:2'],
            'available_weekdays.*' => ['integer', 'between:1,7'],
            'long_run_weekday' => ['required', 'integer', 'between:1,7'],
            'current_weekly_distance_km' => ['required', 'numeric', 'min:0', 'max:200'],
            'level' => ['nullable', Rule::in(['beginner', 'intermediate'])],
        ]);

        $startDate = CarbonImmutable::parse($validated['start_date'] ?? now()->toDateString())->startOfDay();
        $raceDate = CarbonImmutable::parse($validated['race_date'])->startOfDay();

        abort_if($raceDate->lessThanOrEqualTo($startDate), 422, 'Race date must be after the start date.');
        abort_if(! in_array($validated['long_run_weekday'], $validated['available_weekdays'], true), 422, 'Long run day must be one of the available weekdays.');

        $plan = $creator->create(
            User::findOrFail($validated['user_id']),
            new TrainingPlanInput(
                raceDistance: $validated['race_distance'],
                startDate: $startDate,
                raceDate: $raceDate,
                availableWeekdays: $validated['available_weekdays'],
                longRunWeekday: $validated['long_run_weekday'],
                currentWeeklyDistanceKm: (float) $validated['current_weekly_distance_km'],
                level: $validated['level'] ?? 'beginner',
            ),
        );

        return response()->json(['data' => $this->serializePlan($plan)], 201);
    }

    public function show(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        abort_if($trainingPlan->user_id !== (int) $validated['user_id'], 404);

        return response()->json([
            'data' => $this->serializePlan(
                $trainingPlan->load([
                    'raceGoal',
                    'revisions',
                    'workouts' => fn ($query) => $query->orderBy('scheduled_on'),
                ]),
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePlan(TrainingPlan $plan): array
    {
        return [
            'id' => $plan->id,
            'status' => $plan->status,
            'level' => $plan->level,
            'starts_on' => $plan->starts_on->toDateString(),
            'ends_on' => $plan->ends_on->toDateString(),
            'source_context' => $plan->source_context,
            'race_goal' => [
                'id' => $plan->raceGoal->id,
                'race_distance' => $plan->raceGoal->race_distance,
                'race_date' => $plan->raceGoal->race_date->toDateString(),
            ],
            'workouts' => $plan->workouts->map(fn ($workout): array => [
                'id' => $workout->id,
                'week_number' => $workout->week_number,
                'scheduled_on' => $workout->scheduled_on->toDateString(),
                'type' => $workout->type,
                'status' => $workout->status,
                'target_distance_km' => $workout->target_distance_km,
                'target_intensity' => $workout->target_intensity,
                'note' => $workout->note,
            ])->all(),
            'revisions' => $plan->revisions->map(fn ($revision): array => [
                'id' => $revision->id,
                'reason' => $revision->reason,
                'summary' => $revision->summary,
                'changes' => $revision->changes,
                'created_at' => $revision->created_at->toIso8601String(),
            ])->all(),
        ];
    }
}
