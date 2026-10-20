<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_tasks(): void
    {
        $this->get(route('tasks.index'))->assertRedirect(route('login'));
    }

    public function test_a_user_can_create_a_task(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('tasks.store'), [
            'title' => 'Write the report',
            'description' => 'Quarterly numbers',
            'status' => 'pending',
            'priority' => 'high',
            'due_date' => '2026-07-01T09:00',
            'reminder_at' => null,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', [
            'title' => 'Write the report',
            'user_id' => $user->id,
            'priority' => 'high',
        ]);
    }

    public function test_completing_a_task_sets_completed_at(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create(['status' => 'pending', 'completed_at' => null]);

        $this->actingAs($user)
            ->patch(route('tasks.status', $task), ['status' => 'completed'])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame('completed', $task->status);
        $this->assertNotNull($task->completed_at);
    }

    public function test_the_list_only_shows_the_users_own_tasks(): void
    {
        $user = User::factory()->create();
        Task::factory(3)->for($user)->create();
        Task::factory(4)->for(User::factory()->create())->create();

        $this->actingAs($user)
            ->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->has('tasks.data', 3));
    }

    public function test_a_user_cannot_modify_another_users_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = Task::factory()->for($owner)->create();

        $payload = [
            'title' => 'Hacked',
            'status' => 'pending',
            'priority' => 'low',
        ];

        $this->actingAs($intruder)->put(route('tasks.update', $task), $payload)->assertForbidden();
        $this->actingAs($intruder)->patch(route('tasks.status', $task), ['status' => 'completed'])->assertForbidden();
        $this->actingAs($intruder)->delete(route('tasks.destroy', $task))->assertForbidden();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => $task->title]);
    }

    public function test_a_user_can_delete_their_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('tasks.destroy', $task))->assertRedirect();
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_attachments_are_stored_privately_and_only_downloadable_by_the_owner(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('tasks.store'), [
            'title' => 'Task with file',
            'status' => 'pending',
            'priority' => 'medium',
            'attachments' => [UploadedFile::fake()->createWithContent('notes.txt', 'A test attachment.')],
        ])->assertRedirect();

        $attachment = $user->tasks()->first()->attachments()->first();
        $this->assertNotNull($attachment);
        Storage::disk('local')->assertExists($attachment->path);

        // Owner can download
        $this->actingAs($user)->get(route('attachments.download', $attachment))->assertOk();

        // A different user cannot
        $this->actingAs(User::factory()->create())
            ->get(route('attachments.download', $attachment))
            ->assertForbidden();
    }

    public function test_dashboard_reports_correct_counts(): void
    {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['status' => 'completed']);
        Task::factory()->for($user)->create(['status' => 'pending', 'due_date' => null]);
        Task::factory()->for($user)->create([
            'status' => 'in_progress',
            'due_date' => now()->subDay(),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('stats.total', 3)
                ->where('stats.completed', 1)
                ->where('stats.pending', 2)
                ->where('stats.overdue', 1));
    }
}
