<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_counts_only_include_own_tasks_and_overdue_is_computed_live(): void
    {
        $this->travelTo(now()->startOfDay()->setHour(12));
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['status' => 'completed', 'due_date' => now()->subDay()]);
        Task::factory()->for($user)->create(['status' => 'pending', 'due_date' => null]);
        Task::factory()->for($user)->create(['status' => 'in_progress', 'due_date' => now()->addHour()]);
        Task::factory()->for(User::factory()->create())->create(['status' => 'pending', 'due_date' => now()->subDay()]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 3)
                ->where('stats.completed', 1)
                ->where('stats.in_progress', 1)
                ->where('stats.pending', 2)
                ->where('stats.overdue', 0)
                ->has('overdueTasks', 0)
                ->has('upcomingTasks', 1));

        // Two hours later the in-progress task has slipped past its due date.
        $this->travel(2)->hours();

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.overdue', 1)
                ->has('overdueTasks', 1)
                ->has('upcomingTasks', 0));
    }

    public function test_empty_dashboard_returns_zero_counts(): void
    {
        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 0)
                ->where('stats.completed', 0)
                ->where('stats.in_progress', 0)
                ->where('stats.pending', 0)
                ->where('stats.overdue', 0));
    }
}
