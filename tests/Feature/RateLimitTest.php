<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_is_rate_limited_after_six_attempts(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post('/register', ['name' => '', 'email' => 'bad', 'password' => 'x'])
                ->assertStatus(302);
        }

        $this->post('/register', ['name' => '', 'email' => 'bad', 'password' => 'x'])
            ->assertStatus(429);
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post('/forgot-password', ['email' => 'nobody@example.com']);
        }

        $this->post('/forgot-password', ['email' => 'nobody@example.com'])->assertStatus(429);
    }

    public function test_verification_notification_does_not_error(): void
    {
        $unverified = User::factory()->unverified()->create();
        $this->actingAs($unverified)->post('/email/verification-notification')->assertStatus(302);

        $verified = User::factory()->create();
        $this->actingAs($verified)->post('/email/verification-notification')->assertStatus(302);
    }
}
