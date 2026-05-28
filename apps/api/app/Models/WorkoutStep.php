<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['workout_id', 'sort_order', 'type', 'target_distance_km', 'target_duration_seconds', 'target_intensity', 'instruction'])]
class WorkoutStep extends Model
{
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'target_distance_km' => 'float',
            'target_duration_seconds' => 'integer',
        ];
    }

    public function workout(): BelongsTo
    {
        return $this->belongsTo(Workout::class);
    }
}
