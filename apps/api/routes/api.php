<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\TrainingPlanPreviewController;
use App\Http\Controllers\TrainingPlanController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/health', fn () => ['status' => 'ok']);
Route::post('/v1/activity-logs', [ActivityLogController::class, 'store']);
Route::post('/v1/training-plan-preview', TrainingPlanPreviewController::class);
Route::post('/v1/training-plans', [TrainingPlanController::class, 'store']);
