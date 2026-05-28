<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'activity_log_id', 'provider', 'external_id', 'started_at', 'distance_km', 'duration_seconds', 'raw_payload'])]
class ExternalActivity extends Model
{
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'distance_km' => 'float',
            'duration_seconds' => 'integer',
            'raw_payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activityLog(): BelongsTo
    {
        return $this->belongsTo(ActivityLog::class);
    }
}
