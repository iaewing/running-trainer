<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AthleteBootstrapTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_reusable_local_runner(): void
    {
        $firstResponse = $this->postJson('/api/v1/athlete-bootstrap', [
            'name' => 'Ian',
            'email' => 'ian@example.test',
        ]);
        $secondResponse = $this->postJson('/api/v1/athlete-bootstrap', [
            'name' => 'Ian',
            'email' => 'ian@example.test',
        ]);

        $firstResponse
            ->assertOk()
            ->assertJsonPath('data.email', 'ian@example.test');

        $this->assertSame($firstResponse->json('data.id'), $secondResponse->json('data.id'));
        $this->assertDatabaseCount(User::class, 1);
    }
}

