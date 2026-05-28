<?php

namespace App\Http\Controllers;

use App\Training\TrainingPlanInput;
use App\Training\TrainingPlanPreviewGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TrainingPlanPreviewController extends Controller
{
    public function __invoke(Request $request, TrainingPlanPreviewGenerator $generator): JsonResponse
    {
        $validated = $request->validate([
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

        $plan = $generator->generate(new TrainingPlanInput(
            raceDistance: $validated['race_distance'],
            startDate: $startDate,
            raceDate: $raceDate,
            availableWeekdays: $validated['available_weekdays'],
            longRunWeekday: $validated['long_run_weekday'],
            currentWeeklyDistanceKm: (float) $validated['current_weekly_distance_km'],
            level: $validated['level'] ?? 'beginner',
        ));

        return response()->json(['data' => $plan]);
    }
}

