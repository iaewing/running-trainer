<?php

namespace Tests\Feature;

use App\Models\AvailabilityRule;
use App\Models\RaceGoal;
use App\Models\TrainingPlan;
use App\Models\User;
use App\Models\Workout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingPlanCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_stored_training_plan(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/training-plans', [
            'user_id' => $user->id,
            'race_distance' => 'half_marathon',
            'start_date' => '2026-06-01',
            'race_date' => '2026-08-24',
            'available_weekdays' => [1, 3, 5, 7],
            'long_run_weekday' => 7,
            'current_weekly_distance_km' => 26,
            'level' => 'intermediate',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.race_goal.race_distance', 'half_marathon')
            ->assertJsonPath('data.level', 'intermediate')
            ->assertJsonCount(1, 'data.revisions');

        $this->assertDatabaseCount(RaceGoal::class, 1);
        $this->assertDatabaseCount(TrainingPlan::class, 1);
        $this->assertDatabaseCount(AvailabilityRule::class, 1);
        $this->assertGreaterThan(20, Workout::count());
        $raceWorkout = Workout::where('type', 'race')->sole();

        $this->assertSame('2026-08-24', $raceWorkout->scheduled_on->toDateString());
    }

    public function test_it_rejects_a_long_run_day_outside_available_days(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/training-plans', [
            'user_id' => $user->id,
            'race_distance' => '10k',
            'start_date' => '2026-06-01',
            'race_date' => '2026-07-27',
            'available_weekdays' => [2, 4, 6],
            'long_run_weekday' => 7,
            'current_weekly_distance_km' => 18,
            'level' => 'beginner',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount(TrainingPlan::class, 0);
    }
}
