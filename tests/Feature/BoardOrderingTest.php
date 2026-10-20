<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardOrderingTest extends TestCase
{
    use RefreshDatabase;

    private function column(User $user, string $status): array
    {
        return $user->tasks()->where('status', $status)->orderBy('position')->pluck('position', 'id')->all();
    }

    public function test_moving_within_a_column_produces_contiguous_positions(): void
    {
        $user = User::factory()->create();
        $a = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 0]);
        $b = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 1]);
        $c = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 2]);

        $this->actingAs($user)->patch(route('tasks.status', $c), ['status' => 'pending', 'position' => 0])->assertRedirect();

        $this->assertSame([$c->id => 0, $a->id => 1, $b->id => 2], $this->column($user, 'pending'));
    }

    public function test_moving_to_another_column_renumbers_both_columns(): void
    {
        $user = User::factory()->create();
        $a = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 0]);
        $b = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 1]);
        $c = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 2]);
        $x = Task::factory()->for($user)->create(['status' => 'in_progress', 'position' => 5]);
        $y = Task::factory()->for($user)->create(['status' => 'in_progress', 'position' => 9]);

        $this->actingAs($user)->patch(route('tasks.status', $a), ['status' => 'in_progress', 'position' => 1]);

        $this->assertSame([$x->id => 0, $a->id => 1, $y->id => 2], $this->column($user, 'in_progress'));
        $this->assertSame([$b->id => 0, $c->id => 1], $this->column($user, 'pending'));
    }

    public function test_position_beyond_the_end_is_clamped_and_other_users_are_untouched(): void
    {
        $user = User::factory()->create();
        $a = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 0]);
        $b = Task::factory()->for($user)->create(['status' => 'pending', 'position' => 1]);
        $foreign = Task::factory()->create(['status' => 'pending', 'position' => 7]);

        $this->actingAs($user)->patch(route('tasks.status', $a), ['status' => 'pending', 'position' => 50]);

        $this->assertSame([$b->id => 0, $a->id => 1], $this->column($user, 'pending'));
        $this->assertSame(7, $foreign->fresh()->position);
    }

    public function test_completed_at_is_set_and_cleared(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create(['status' => 'pending', 'completed_at' => null]);

        $this->actingAs($user)->patch(route('tasks.status', $task), ['status' => 'completed', 'position' => 0]);
        $task->refresh();
        $this->assertSame('completed', $task->status);
        $this->assertNotNull($task->completed_at);
        $first = $task->completed_at;

        $this->actingAs($user)->patch(route('tasks.status', $task), ['status' => 'completed']);
        $this->assertEquals($first, $task->fresh()->completed_at);

        $this->actingAs($user)->patch(route('tasks.status', $task), ['status' => 'pending', 'position' => 0]);
        $this->assertNull($task->fresh()->completed_at);
    }
}
