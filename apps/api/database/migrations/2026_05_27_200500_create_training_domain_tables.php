<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('athlete_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('experience_level')->default('beginner');
            $table->decimal('current_weekly_distance_km', 5, 1)->default(0);
            $table->decimal('longest_recent_run_km', 5, 1)->nullable();
            $table->json('injury_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('race_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('race_distance');
            $table->date('race_date');
            $table->unsignedInteger('target_time_seconds')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('availability_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('available_weekdays');
            $table->unsignedTinyInteger('long_run_weekday');
            $table->json('unavailable_dates')->nullable();
            $table->timestamps();
        });

        Schema::create('training_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('race_goal_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->string('level')->default('beginner');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->json('source_context')->nullable();
            $table->timestamps();
        });

        Schema::create('plan_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_plan_id')->constrained()->cascadeOnDelete();
            $table->string('reason');
            $table->text('summary');
            $table->json('changes')->nullable();
            $table->timestamps();
        });

        Schema::create('workouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('week_number');
            $table->date('scheduled_on');
            $table->string('type');
            $table->string('status')->default('planned');
            $table->decimal('target_distance_km', 5, 1)->nullable();
            $table->unsignedInteger('target_duration_seconds')->nullable();
            $table->string('target_intensity')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['training_plan_id', 'scheduled_on']);
        });

        Schema::create('workout_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');
            $table->string('type');
            $table->decimal('target_distance_km', 5, 1)->nullable();
            $table->unsignedInteger('target_duration_seconds')->nullable();
            $table->string('target_intensity')->nullable();
            $table->text('instruction')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('workout_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source')->default('manual');
            $table->dateTime('started_at')->nullable();
            $table->decimal('distance_km', 5, 1)->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedTinyInteger('effort_rpe')->nullable();
            $table->string('completion_status')->default('completed');
            $table->text('notes')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });

        Schema::create('readiness_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('logged_on');
            $table->unsignedTinyInteger('fatigue')->nullable();
            $table->unsignedTinyInteger('soreness')->nullable();
            $table->unsignedTinyInteger('sleep_quality')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'logged_on']);
        });

        Schema::create('life_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('severity')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('integration_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('status')->default('connected');
            $table->json('capabilities')->nullable();
            $table->dateTime('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'provider']);
        });

        Schema::create('external_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('activity_log_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider');
            $table->string('external_id');
            $table->dateTime('started_at')->nullable();
            $table->decimal('distance_km', 5, 1)->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'external_id']);
        });

        Schema::create('workout_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('status')->default('pending');
            $table->string('external_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workout_exports');
        Schema::dropIfExists('external_activities');
        Schema::dropIfExists('integration_connections');
        Schema::dropIfExists('life_events');
        Schema::dropIfExists('readiness_logs');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('workout_steps');
        Schema::dropIfExists('workouts');
        Schema::dropIfExists('plan_revisions');
        Schema::dropIfExists('training_plans');
        Schema::dropIfExists('availability_rules');
        Schema::dropIfExists('race_goals');
        Schema::dropIfExists('athlete_profiles');
    }
};
