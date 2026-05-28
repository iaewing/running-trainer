<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['workout_id', 'provider', 'status', 'external_id', 'error_message'])]
class WorkoutExport extends Model
{
    public function workout(): BelongsTo
    {
        return $this->belongsTo(Workout::class);
    }
}
