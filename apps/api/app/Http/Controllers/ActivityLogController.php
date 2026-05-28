<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Workout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ActivityLogController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'workout_id' => ['nullable', 'integer', 'exists:workouts,id'],
            'started_at' => ['nullable', 'date'],
            'distance_km' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'effort_rpe' => ['nullable', 'integer', 'between:1,10'],
            'completion_status' => ['required', Rule::in(['completed', 'shortened', 'skipped', 'replaced'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = User::findOrFail($validated['user_id']);
        $workout = isset($validated['workout_id'])
            ? Workout::with('trainingPlan')->findOrFail($validated['workout_id'])
            : null;

        abort_if(
            $workout && $workout->trainingPlan->user_id !== $user->id,
            422,
            'Workout does not belong to the given user.',
        );

        $activityLog = DB::transaction(function () use ($validated, $workout): ActivityLog {
            $activityLog = ActivityLog::create([
                'user_id' => $validated['user_id'],
                'workout_id' => $workout?->id,
                'source' => 'manual',
                'started_at' => $validated['started_at'] ?? null,
                'distance_km' => $validated['distance_km'] ?? null,
                'duration_seconds' => $validated['duration_seconds'] ?? null,
                'effort_rpe' => $validated['effort_rpe'] ?? null,
                'completion_status' => $validated['completion_status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            if ($workout) {
                $workout->update(['status' => $validated['completion_status']]);
            }

            return $activityLog->load('workout');
        });

        return response()->json(['data' => $this->serializeActivityLog($activityLog)], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeActivityLog(ActivityLog $activityLog): array
    {
        return [
            'id' => $activityLog->id,
            'user_id' => $activityLog->user_id,
            'workout_id' => $activityLog->workout_id,
            'source' => $activityLog->source,
            'started_at' => $activityLog->started_at?->toIso8601String(),
            'distance_km' => $activityLog->distance_km,
            'duration_seconds' => $activityLog->duration_seconds,
            'effort_rpe' => $activityLog->effort_rpe,
            'completion_status' => $activityLog->completion_status,
            'notes' => $activityLog->notes,
            'workout' => $activityLog->workout ? [
                'id' => $activityLog->workout->id,
                'status' => $activityLog->workout->status,
                'scheduled_on' => $activityLog->workout->scheduled_on->toDateString(),
                'type' => $activityLog->workout->type,
            ] : null,
        ];
    }
}

