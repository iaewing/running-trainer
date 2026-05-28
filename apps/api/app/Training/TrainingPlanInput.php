<?php

namespace App\Training;

use Carbon\CarbonImmutable;

final readonly class TrainingPlanInput
{
    /**
     * @param  list<int>  $availableWeekdays ISO-8601 weekdays, 1 Monday through 7 Sunday.
     */
    public function __construct(
        public string $raceDistance,
        public CarbonImmutable $startDate,
        public CarbonImmutable $raceDate,
        public array $availableWeekdays,
        public int $longRunWeekday,
        public float $currentWeeklyDistanceKm,
        public string $level,
    ) {}
}

