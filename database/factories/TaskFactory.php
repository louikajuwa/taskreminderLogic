<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(Task::STATUSES);
        $dueDate = fake()->boolean(80)
            ? fake()->dateTimeBetween('-1 week', '+3 weeks')
            : null;

        return [
            'user_id' => User::factory(),
            'title' => rtrim(fake()->sentence(fake()->numberBetween(3, 6)), '.'),
            'description' => fake()->boolean(70) ? fake()->paragraph() : null,
            'status' => $status,
            'priority' => fake()->randomElement(Task::PRIORITIES),
            'due_date' => $dueDate,
            'reminder_at' => $dueDate && fake()->boolean(40)
                ? (clone $dueDate)->modify('-1 day')
                : null,
            'completed_at' => $status === 'completed' ? fake()->dateTimeBetween('-1 week', 'now') : null,
            'position' => fake()->numberBetween(0, 10),
        ];
    }
}
