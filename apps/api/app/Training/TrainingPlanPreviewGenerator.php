<?php

namespace App\Training;

use Carbon\CarbonImmutable;

class TrainingPlanPreviewGenerator
{
    /**
     * @return array<string, mixed>
     */
    public function generate(TrainingPlanInput $input): array
    {
        $availableWeekdays = $this->normalizeWeekdays($input->availableWeekdays);
        $weeksUntilRace = max(1, (int) ceil($input->startDate->diffInDays($input->raceDate) / 7));
        $raceDistanceKm = $input->raceDistance === '10k' ? 10.0 : 21.1;
        $peakLongRunKm = $input->raceDistance === '10k'
            ? ($input->level === 'intermediate' ? 12.0 : 10.0)
            : ($input->level === 'intermediate' ? 19.0 : 17.0);
        $startingWeeklyKm = max($input->currentWeeklyDistanceKm, $raceDistanceKm * 0.8);
        $peakWeeklyKm = max(
            $startingWeeklyKm,
            $input->raceDistance === '10k'
                ? ($input->level === 'intermediate' ? 38.0 : 28.0)
                : ($input->level === 'intermediate' ? 52.0 : 38.0)
        );

        $weeks = [];

        for ($weekNumber = 1; $weekNumber <= $weeksUntilRace; $weekNumber++) {
            $weekStart = $input->startDate->startOfWeek()->addWeeks($weekNumber - 1);
            $isRaceWeek = $weekNumber === $weeksUntilRace;
            $weekTargetKm = $this->weeklyTargetKm($startingWeeklyKm, $peakWeeklyKm, $weekNumber, $weeksUntilRace);
            $runDates = $this->runDatesForWeek($weekStart, $input->raceDate, $availableWeekdays);

            $workouts = $isRaceWeek
                ? $this->raceWeekWorkouts($runDates, $input->raceDate, $input->raceDistance, $raceDistanceKm)
                : $this->buildWeekWorkouts(
                    runDates: $runDates,
                    longRunWeekday: $input->longRunWeekday,
                    targetKm: $weekTargetKm,
                    peakLongRunKm: $peakLongRunKm,
                    weekNumber: $weekNumber,
                    level: $input->level,
                );

            $weeks[] = [
                'week' => $weekNumber,
                'starts_on' => $weekStart->toDateString(),
                'target_distance_km' => round($weekTargetKm, 1),
                'focus' => $isRaceWeek ? 'race' : $this->weekFocus($weekNumber),
                'workouts' => $workouts,
            ];
        }

        return [
            'race_distance' => $input->raceDistance,
            'race_date' => $input->raceDate->toDateString(),
            'level' => $input->level,
            'weeks' => $weeks,
        ];
    }

    /**
     * @param  list<int>  $weekdays
     * @return list<int>
     */
    private function normalizeWeekdays(array $weekdays): array
    {
        $normalized = array_values(array_unique(array_map('intval', $weekdays)));
        sort($normalized);

        return $normalized;
    }

    /**
     * @param  list<int>  $availableWeekdays
     * @return list<CarbonImmutable>
     */
    private function runDatesForWeek(CarbonImmutable $weekStart, CarbonImmutable $raceDate, array $availableWeekdays): array
    {
        $dates = [];

        foreach ($availableWeekdays as $weekday) {
            $date = $weekStart->addDays($weekday - 1);

            if ($date->lessThan($raceDate)) {
                $dates[] = $date;
            }
        }

        return $dates;
    }

    private function weeklyTargetKm(float $startingWeeklyKm, float $peakWeeklyKm, int $weekNumber, int $weeksUntilRace): float
    {
        if ($weekNumber === $weeksUntilRace) {
            return max($startingWeeklyKm * 0.45, 8.0);
        }

        if ($weekNumber === $weeksUntilRace - 1) {
            return max($startingWeeklyKm * 0.65, 12.0);
        }

        $buildWeeks = max(1, $weeksUntilRace - 2);
        $progress = min(1, ($weekNumber - 1) / $buildWeeks);
        $target = $startingWeeklyKm + (($peakWeeklyKm - $startingWeeklyKm) * $progress);

        if ($weekNumber > 1 && $weekNumber % 4 === 0) {
            $target *= 0.82;
        }

        return $target;
    }

    /**
     * @param  list<CarbonImmutable>  $runDates
     * @return list<array<string, mixed>>
     */
    private function buildWeekWorkouts(
        array $runDates,
        int $longRunWeekday,
        float $targetKm,
        float $peakLongRunKm,
        int $weekNumber,
        string $level,
    ): array {
        if ($runDates === []) {
            return [];
        }

        $longRunDate = $this->chooseLongRunDate($runDates, $longRunWeekday);
        $qualityDate = count($runDates) >= 3
            ? $this->chooseQualityDate($runDates, $longRunDate)
            : null;

        $longRunKm = min($peakLongRunKm, max(6.0, $targetKm * 0.34));
        $qualityKm = $qualityDate ? max(5.0, $targetKm * 0.23) : 0.0;
        $remainingEasyKm = max(0, $targetKm - $longRunKm - $qualityKm);
        $easyRunCount = max(1, count($runDates) - ($qualityDate ? 2 : 1));
        $easyKm = $remainingEasyKm / $easyRunCount;

        $workouts = [];

        foreach ($runDates as $date) {
            if ($date->equalTo($longRunDate)) {
                $workouts[] = $this->workout($date, 'long_run', round($longRunKm, 1), 'Easy aerobic effort; finish controlled.');

                continue;
            }

            if ($qualityDate && $date->equalTo($qualityDate)) {
                $workouts[] = $this->qualityWorkout($date, $qualityKm, $weekNumber, $level);

                continue;
            }

            $workouts[] = $this->workout($date, 'easy', round(max(3.0, $easyKm), 1), 'Conversational effort.');
        }

        usort($workouts, fn (array $a, array $b): int => strcmp($a['date'], $b['date']));

        return $workouts;
    }

    /**
     * @param  list<CarbonImmutable>  $runDates
     */
    private function chooseLongRunDate(array $runDates, int $longRunWeekday): CarbonImmutable
    {
        foreach ($runDates as $date) {
            if ($date->dayOfWeekIso === $longRunWeekday) {
                return $date;
            }
        }

        return $runDates[array_key_last($runDates)];
    }

    /**
     * @param  list<CarbonImmutable>  $runDates
     */
    private function chooseQualityDate(array $runDates, CarbonImmutable $longRunDate): ?CarbonImmutable
    {
        foreach ($runDates as $date) {
            if (abs($date->diffInDays($longRunDate, false)) >= 2) {
                return $date;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function qualityWorkout(CarbonImmutable $date, float $distanceKm, int $weekNumber, string $level): array
    {
        if ($weekNumber % 3 === 0) {
            return $this->workout($date, 'intervals', round($distanceKm, 1), $level === 'intermediate'
                ? 'Warm up, then controlled repeats at 10K effort.'
                : 'Short relaxed pickups with full control.');
        }

        return $this->workout($date, 'tempo', round($distanceKm, 1), 'Comfortably hard middle section; do not race it.');
    }

    /**
     * @param  list<CarbonImmutable>  $runDates
     * @return list<array<string, mixed>>
     */
    private function raceWeekWorkouts(array $runDates, CarbonImmutable $raceDate, string $raceDistance, float $raceDistanceKm): array
    {
        $workouts = [];

        foreach ($runDates as $date) {
            if ($date->diffInDays($raceDate) <= 2) {
                $workouts[] = $this->workout($date, 'recovery', 3.0, 'Keep this very easy.');

                continue;
            }

            $workouts[] = $this->workout($date, 'easy', 4.0, 'Stay relaxed and fresh.');
        }

        $workouts[] = $this->workout($raceDate, 'race', $raceDistanceKm, $raceDistance === '10k' ? '10K race day.' : 'Half-marathon race day.');

        usort($workouts, fn (array $a, array $b): int => strcmp($a['date'], $b['date']));

        return $workouts;
    }

    /**
     * @return array<string, mixed>
     */
    private function workout(CarbonImmutable $date, string $type, float $distanceKm, string $note): array
    {
        return [
            'date' => $date->toDateString(),
            'weekday' => $date->dayOfWeekIso,
            'type' => $type,
            'target_distance_km' => $distanceKm,
            'intensity' => match ($type) {
                'tempo' => 'moderate_hard',
                'intervals', 'race' => 'hard',
                'recovery' => 'very_easy',
                default => 'easy',
            },
            'note' => $note,
        ];
    }

    private function weekFocus(int $weekNumber): string
    {
        return match (true) {
            $weekNumber % 4 === 0 => 'down_week',
            $weekNumber % 3 === 0 => 'speed',
            default => 'aerobic_build',
        };
    }
}

