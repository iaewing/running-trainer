<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['user_id', 'workout_id', 'source', 'started_at', 'distance_km', 'duration_seconds', 'effort_rpe', 'completion_status', 'notes', 'raw_payload'])]
class ActivityLog extends Model
{
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'distance_km' => 'float',
            'duration_seconds' => 'integer',
            'effort_rpe' => 'integer',
            'raw_payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workout(): BelongsTo
    {
        return $this->belongsTo(Workout::class);
    }

    public function externalActivity(): HasOne
    {
        return $this->hasOne(ExternalActivity::class);
    }
}
