<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskFilteringTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_treats_percent_and_underscore_literally(): void
    {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['title' => '100% done', 'description' => null]);
        Task::factory()->for($user)->create(['title' => 'Plain task', 'description' => null]);
        Task::factory()->for($user)->create(['title' => 'snake_case', 'description' => null]);
        Task::factory()->for($user)->create(['title' => 'snakeXcase', 'description' => null]);

        $this->actingAs($user)->get(route('tasks.index', ['search' => '%']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 1)->where('tasks.data.0.title', '100% done'));

        $this->actingAs($user)->get(route('tasks.index', ['search' => 'e_c']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 1)->where('tasks.data.0.title', 'snake_case'));
    }

    public function test_filters_by_status_and_priority(): void
    {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['status' => 'pending', 'priority' => 'high']);
        Task::factory()->for($user)->create(['status' => 'pending', 'priority' => 'low']);
        Task::factory()->for($user)->create(['status' => 'completed', 'priority' => 'high']);

        $this->actingAs($user)->get(route('tasks.index', ['status' => 'pending']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 2)->where('filters.status', 'pending'));

        $this->actingAs($user)->get(route('tasks.index', ['priority' => 'high']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 2));

        $this->actingAs($user)->get(route('tasks.index', ['status' => 'pending', 'priority' => 'high']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 1));
    }

    public function test_overdue_filter_excludes_completed_and_future_tasks(): void
    {
        $user = User::factory()->create();
        $overdue = Task::factory()->for($user)->create(['status' => 'pending', 'due_date' => now()->subDay()]);
        Task::factory()->for($user)->create(['status' => 'completed', 'due_date' => now()->subDay()]);
        Task::factory()->for($user)->create(['status' => 'pending', 'due_date' => now()->addDay()]);
        Task::factory()->for($user)->create(['status' => 'pending', 'due_date' => null]);

        $this->actingAs($user)->get(route('tasks.index', ['overdue' => 1]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('tasks.data', 1)
                ->where('tasks.data.0.id', $overdue->id)
                ->where('filters.overdue', true));

        $this->actingAs($user)->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 4)->where('filters.overdue', false));
    }

    public function test_sorting_by_priority_uses_semantic_order(): void
    {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['priority' => 'medium']);
        Task::factory()->for($user)->create(['priority' => 'high']);
        Task::factory()->for($user)->create(['priority' => 'low']);

        $this->actingAs($user)->get(route('tasks.index', ['sort' => 'priority', 'direction' => 'asc']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.data.0.priority', 'low')
                ->where('tasks.data.1.priority', 'medium')
                ->where('tasks.data.2.priority', 'high'));

        $this->actingAs($user)->get(route('tasks.index', ['sort' => 'priority', 'direction' => 'desc']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.data.0.priority', 'high')
                ->where('tasks.data.2.priority', 'low'));
    }

    public function test_invalid_query_parameters_do_not_error(): void
    {
        $user = User::factory()->create();
        Task::factory(2)->for($user)->create();

        $this->actingAs($user)->get('/tasks?sort=drop_table&direction=sideways&status=bogus&priority=bogus&page=abc&overdue=maybe')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'created_at')
                ->where('filters.direction', 'desc')
                ->where('filters.status', '')
                ->where('filters.priority', '')
                ->where('tasks.current_page', 1));

        $this->actingAs($user)->get('/tasks?sort[]=x&status[]=y&search[]=z&page=-5&direction[]=asc')->assertOk();
        $this->actingAs($user)->get('/tasks/board?search[]=z&priority[]=x')->assertOk();
    }

    public function test_search_is_capped_to_100_characters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('tasks.index', ['search' => str_repeat('a', 300)]))
            ->assertInertia(fn (Assert $page) => $page->where('filters.search', str_repeat('a', 100)));
    }

    public function test_pagination_is_ten_per_page(): void
    {
        $user = User::factory()->create();
        Task::factory(12)->for($user)->create();

        $this->actingAs($user)->get(route('tasks.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page->has('tasks.data', 2));
    }
}
