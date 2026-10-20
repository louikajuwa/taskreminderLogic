<?php

namespace Tests\Unit;

use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_is_overdue_accessor(): void
    {
        $this->assertTrue(Task::factory()->make(['status' => 'pending', 'due_date' => now()->subMinute()])->is_overdue);
        $this->assertFalse(Task::factory()->make(['status' => 'completed', 'due_date' => now()->subDay()])->is_overdue);
        $this->assertFalse(Task::factory()->make(['status' => 'pending', 'due_date' => now()->addDay()])->is_overdue);
        $this->assertFalse(Task::factory()->make(['status' => 'pending', 'due_date' => null])->is_overdue);
    }

    public function test_overdue_scope(): void
    {
        $overdue = Task::factory()->create(['status' => 'in_progress', 'due_date' => now()->subDay()]);
        Task::factory()->create(['status' => 'completed', 'due_date' => now()->subDay()]);
        Task::factory()->create(['status' => 'pending', 'due_date' => now()->addDay()]);
        Task::factory()->create(['status' => 'pending', 'due_date' => null]);

        $this->assertSame([$overdue->id], Task::overdue()->pluck('id')->all());
    }
}
