<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'logged_on', 'fatigue', 'soreness', 'sleep_quality', 'notes'])]
class ReadinessLog extends Model
{
    protected function casts(): array
    {
        return [
            'logged_on' => 'date',
            'fatigue' => 'integer',
            'soreness' => 'integer',
            'sleep_quality' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
