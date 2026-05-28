<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'experience_level', 'current_weekly_distance_km', 'longest_recent_run_km', 'injury_notes'])]
class AthleteProfile extends Model
{
    protected function casts(): array
    {
        return [
            'current_weekly_distance_km' => 'float',
            'longest_recent_run_km' => 'float',
            'injury_notes' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
