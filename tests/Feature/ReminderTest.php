<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_due_reminders_scope(): void
    {
        $user = User::factory()->create();
        $due = Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => now()->subHour()]);
        Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => now()->addHour()]);
        Task::factory()->for($user)->create(['status' => 'completed', 'reminder_at' => now()->subHour()]);
        $dismissed = Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => now()->subHour()]);
        $dismissed->forceFill(['reminder_dismissed_at' => now()])->save();
        Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => null]);

        $this->assertSame([$due->id], Task::dueReminders()->pluck('id')->all());
    }

    public function test_dismissed_at_is_not_mass_assignable(): void
    {
        $task = Task::factory()->create();
        $task->fill(['reminder_dismissed_at' => now()]);

        $this->assertNull($task->reminder_dismissed_at);
    }

    public function test_shared_reminders_prop_contains_only_own_due_reminders(): void
    {
        $user = User::factory()->create();
        $mine = Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => now()->subMinute()]);
        Task::factory()->for(User::factory()->create())->create(['status' => 'pending', 'reminder_at' => now()->subMinute()]);

        $this->actingAs($user)->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('reminders.count', 1)
                ->has('reminders.items', 1)
                ->where('reminders.items.0.id', $mine->id)
                ->has('reminders.items.0', fn (Assert $item) => $item
                    ->hasAll(['id', 'title', 'reminder_at', 'due_date', 'priority'])));
    }

    public function test_shared_reminder_items_are_capped_at_five(): void
    {
        $user = User::factory()->create();
        Task::factory(7)->for($user)->create(['status' => 'pending', 'reminder_at' => now()->subMinute()]);

        $this->actingAs($user)->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page->where('reminders.count', 7)->has('reminders.items', 5));
    }

    public function test_shared_auth_user_only_exposes_whitelisted_fields(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('auth.user', fn (Assert $u) => $u->hasAll(['id', 'name', 'email', 'email_verified_at']))
                ->missing('auth.user.created_at')
                ->missing('auth.user.updated_at'));
    }

    public function test_dismissing_a_reminder(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create(['status' => 'pending', 'reminder_at' => now()->subMinute()]);

        $this->actingAs($user)->patch(route('tasks.reminder.dismiss', $task))
            ->assertRedirect()
            ->assertSessionHas('success', 'Reminder dismissed.');

        $this->assertNotNull($task->fresh()->reminder_dismissed_at);
        $this->assertSame(0, Task::dueReminders()->count());
    }

    public function test_other_users_cannot_dismiss_a_reminder(): void
    {
        $task = Task::factory()->create(['reminder_at' => now()->subMinute()]);

        $this->actingAs(User::factory()->create())
            ->patch(route('tasks.reminder.dismiss', $task))
            ->assertForbidden();

        $this->assertNull($task->fresh()->reminder_dismissed_at);
    }

    public function test_changing_reminder_at_resets_dismissal(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create([
            'status' => 'pending',
            'due_date' => null,
            'reminder_at' => now()->subDay(),
        ]);
        $task->forceFill(['reminder_dismissed_at' => now()])->save();

        $payload = ['title' => $task->title, 'status' => 'pending', 'priority' => 'low'];

        // Unchanged reminder keeps the dismissal.
        $this->actingAs($user)->put(route('tasks.update', $task), $payload + ['reminder_at' => $task->reminder_at->format('Y-m-d H:i:s')]);
        $this->assertNotNull($task->fresh()->reminder_dismissed_at);

        // Changed reminder resets it.
        $this->actingAs($user)->put(route('tasks.update', $task), $payload + ['reminder_at' => now()->subHour()->format('Y-m-d H:i:s')]);
        $this->assertNull($task->fresh()->reminder_dismissed_at);
    }
}
