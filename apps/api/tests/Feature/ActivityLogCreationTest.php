<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\PlanRevision;
use App\Models\User;
use App\Models\Workout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_logs_a_manual_run_against_a_planned_workout(): void
    {
        $user = User::factory()->create();
        $this->createPlan($user);
        $workout = Workout::where('type', 'easy')->firstOrFail();

        $response = $this->postJson('/api/v1/activity-logs', [
            'user_id' => $user->id,
            'workout_id' => $workout->id,
            'started_at' => '2026-06-03T07:30:00-04:00',
            'distance_km' => 6.2,
            'duration_seconds' => 2100,
            'effort_rpe' => 4,
            'completion_status' => 'completed',
            'notes' => 'Comfortable before work.',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.source', 'manual')
            ->assertJsonPath('data.workout_id', $workout->id)
            ->assertJsonPath('data.workout.status', 'completed');

        $this->assertDatabaseCount(ActivityLog::class, 1);
        $this->assertSame('completed', $workout->refresh()->status);
    }

    public function test_it_logs_an_unplanned_manual_run(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/activity-logs', [
            'user_id' => $user->id,
            'started_at' => '2026-06-03T07:30:00-04:00',
            'distance_km' => 4.5,
            'duration_seconds' => 1650,
            'effort_rpe' => 3,
            'completion_status' => 'completed',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.workout_id', null)
            ->assertJsonPath('data.workout', null);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'source' => 'manual',
            'completion_status' => 'completed',
        ]);
    }

    public function test_it_rejects_a_workout_that_belongs_to_another_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $this->createPlan($owner);
        $workout = Workout::firstOrFail();

        $response = $this->postJson('/api/v1/activity-logs', [
            'user_id' => $otherUser->id,
            'workout_id' => $workout->id,
            'completion_status' => 'completed',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount(ActivityLog::class, 0);
    }

    public function test_it_reduces_the_next_quality_workout_after_a_high_effort_log(): void
    {
        $user = User::factory()->create();
        $this->createPlan($user);
        $loggedWorkout = Workout::where('type', 'easy')->orderBy('scheduled_on')->firstOrFail();
        $nextQualityWorkout = Workout::where('scheduled_on', '>', $loggedWorkout->scheduled_on)
            ->whereIn('type', ['tempo', 'intervals', 'long_run'])
            ->orderBy('scheduled_on')
            ->firstOrFail();
        $originalDistance = $nextQualityWorkout->target_distance_km;

        $this->postJson('/api/v1/activity-logs', [
            'user_id' => $user->id,
            'workout_id' => $loggedWorkout->id,
            'distance_km' => $loggedWorkout->target_distance_km,
            'duration_seconds' => 2100,
            'effort_rpe' => 8,
            'completion_status' => 'completed',
        ])->assertCreated();

        $nextQualityWorkout->refresh();

        $this->assertSame('very_easy', $nextQualityWorkout->target_intensity);
        $this->assertLessThan($originalDistance, $nextQualityWorkout->target_distance_km);
        $this->assertDatabaseHas(PlanRevision::class, [
            'reason' => 'high_effort',
        ]);
    }

    public function test_it_reduces_the_next_quality_workout_after_a_skipped_run(): void
    {
        $user = User::factory()->create();
        $this->createPlan($user);
        $loggedWorkout = Workout::where('type', 'tempo')->orderBy('scheduled_on')->firstOrFail();
        $nextQualityWorkout = Workout::where('scheduled_on', '>', $loggedWorkout->scheduled_on)
            ->whereIn('type', ['tempo', 'intervals', 'long_run'])
            ->orderBy('scheduled_on')
            ->firstOrFail();

        $this->postJson('/api/v1/activity-logs', [
            'user_id' => $user->id,
            'workout_id' => $loggedWorkout->id,
            'completion_status' => 'skipped',
            'notes' => 'Work ran late.',
        ])->assertCreated();

        $this->assertSame('skipped', $loggedWorkout->refresh()->status);
        $this->assertSame('very_easy', $nextQualityWorkout->refresh()->target_intensity);
        $this->assertDatabaseHas(PlanRevision::class, [
            'reason' => 'missed_workout',
        ]);
    }

    private function createPlan(User $user): void
    {
        $this->postJson('/api/v1/training-plans', [
            'user_id' => $user->id,
            'race_distance' => '10k',
            'start_date' => '2026-06-01',
            'race_date' => '2026-07-27',
            'available_weekdays' => [2, 4, 6],
            'long_run_weekday' => 6,
            'current_weekly_distance_km' => 18,
            'level' => 'beginner',
        ])->assertCreated();
    }
}
