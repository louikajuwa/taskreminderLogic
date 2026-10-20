<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskValidationTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'A valid title',
            'status' => 'pending',
            'priority' => 'medium',
        ], $overrides);
    }

    public function test_a_user_can_update_their_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create(['status' => 'pending']);

        $this->actingAs($user)
            ->put(route('tasks.update', $task), $this->payload(['title' => 'Renamed', 'status' => 'completed', 'priority' => 'high']))
            ->assertRedirect()
            ->assertSessionHas('success');

        $task->refresh();
        $this->assertSame('Renamed', $task->title);
        $this->assertSame('high', $task->priority);
        $this->assertNotNull($task->completed_at);
    }

    public function test_title_is_required(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('tasks.store'), $this->payload(['title' => '']))
            ->assertSessionHasErrors('title');
    }

    public function test_whitespace_only_title_is_rejected(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('tasks.store'), $this->payload(['title' => '    ']))
            ->assertSessionHasErrors('title');
    }

    public function test_title_longer_than_255_characters_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), $this->payload(['title' => str_repeat('a', 256)]))
            ->assertSessionHasErrors('title');

        $this->actingAs($user)
            ->post(route('tasks.store'), $this->payload(['title' => str_repeat('a', 255)]))
            ->assertSessionDoesntHaveErrors();
    }

    public function test_invalid_status_and_priority_are_rejected(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('tasks.store'), $this->payload(['status' => 'bogus', 'priority' => 'urgent']))
            ->assertSessionHasErrors(['status', 'priority']);
    }

    public function test_reminder_after_due_date_is_rejected(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('tasks.store'), $this->payload([
                'due_date' => '2026-12-01T09:00',
                'reminder_at' => '2026-12-02T09:00',
            ]))
            ->assertSessionHasErrors('reminder_at');
    }

    public function test_reminder_before_or_at_due_date_is_accepted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), $this->payload([
                'due_date' => '2026-12-01T09:00',
                'reminder_at' => '2026-12-01T09:00',
            ]))
            ->assertSessionDoesntHaveErrors();

        $this->assertSame(1, $user->tasks()->count());
    }

    public function test_reminder_without_due_date_is_accepted(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('tasks.store'), $this->payload(['reminder_at' => '2026-12-02T09:00']))
            ->assertSessionDoesntHaveErrors();
    }

    public function test_unicode_and_special_character_titles_persist(): void
    {
        $user = User::factory()->create();
        $title = 'Café ☕ 日本語 <b>"quotes"</b> & 100% done_ \\ ünïcödé';

        $this->actingAs($user)->post(route('tasks.store'), $this->payload(['title' => $title]))
            ->assertSessionDoesntHaveErrors();

        $this->assertSame($title, $user->tasks()->first()->title);
    }

    public function test_title_is_trimmed(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('tasks.store'), $this->payload(['title' => '  Padded  ']));

        $this->assertSame('Padded', $user->tasks()->first()->title);
    }

    public function test_nonexistent_task_returns_404(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->put(route('tasks.update', 99999), $this->payload())->assertNotFound();
        $this->actingAs($user)->patch(route('tasks.status', 99999), ['status' => 'completed'])->assertNotFound();
        $this->actingAs($user)->delete(route('tasks.destroy', 99999))->assertNotFound();
    }

    public function test_update_status_rejects_invalid_values(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('tasks.status', $task), ['status' => 'bogus', 'position' => -1])
            ->assertSessionHasErrors(['status', 'position']);
    }
}
