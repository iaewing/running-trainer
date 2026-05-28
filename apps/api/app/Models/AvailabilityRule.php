<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'available_weekdays', 'long_run_weekday', 'unavailable_dates'])]
class AvailabilityRule extends Model
{
    protected function casts(): array
    {
        return [
            'available_weekdays' => 'array',
            'long_run_weekday' => 'integer',
            'unavailable_dates' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
