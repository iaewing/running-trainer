<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['training_plan_id', 'week_number', 'scheduled_on', 'type', 'status', 'target_distance_km', 'target_duration_seconds', 'target_intensity', 'note'])]
class Workout extends Model
{
    protected function casts(): array
    {
        return [
            'week_number' => 'integer',
            'scheduled_on' => 'date',
            'target_distance_km' => 'float',
            'target_duration_seconds' => 'integer',
        ];
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WorkoutStep::class);
    }

    public function activityLog(): HasOne
    {
        return $this->hasOne(ActivityLog::class);
    }
}
