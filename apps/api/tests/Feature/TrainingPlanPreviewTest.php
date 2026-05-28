<?php

namespace Tests\Feature;

use Tests\TestCase;

class TrainingPlanPreviewTest extends TestCase
{
    public function test_it_generates_a_10k_training_plan_preview(): void
    {
        $response = $this->postJson('/api/v1/training-plan-preview', [
            'race_distance' => '10k',
            'start_date' => '2026-06-01',
            'race_date' => '2026-07-27',
            'available_weekdays' => [2, 4, 6],
            'long_run_weekday' => 6,
            'current_weekly_distance_km' => 18,
            'level' => 'beginner',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.race_distance', '10k')
            ->assertJsonPath('data.race_date', '2026-07-27')
            ->assertJsonPath('data.weeks.0.workouts.2.type', 'long_run');
    }

    public function test_it_keeps_planned_runs_on_available_weekdays_until_race_day(): void
    {
        $response = $this->postJson('/api/v1/training-plan-preview', [
            'race_distance' => 'half_marathon',
            'start_date' => '2026-06-01',
            'race_date' => '2026-08-24',
            'available_weekdays' => [1, 3, 5, 7],
            'long_run_weekday' => 7,
            'current_weekly_distance_km' => 26,
            'level' => 'intermediate',
        ]);

        $weekdays = collect($response->json('data.weeks'))
            ->flatMap(fn (array $week): array => $week['workouts'])
            ->reject(fn (array $workout): bool => $workout['type'] === 'race')
            ->pluck('weekday')
            ->unique()
            ->sort()
            ->values()
            ->all();

        $this->assertSame([1, 3, 5, 7], $weekdays);
    }

    public function test_it_rejects_a_race_date_before_the_start_date(): void
    {
        $response = $this->postJson('/api/v1/training-plan-preview', [
            'race_distance' => '10k',
            'start_date' => '2026-07-27',
            'race_date' => '2026-06-01',
            'available_weekdays' => [2, 4, 6],
            'long_run_weekday' => 6,
            'current_weekly_distance_km' => 18,
        ]);

        $response->assertStatus(422);
    }
}
