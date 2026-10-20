<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'user_id' => fn (array $attributes) => Task::find($attributes['task_id'])->user_id,
            'original_name' => fake()->word().'.txt',
            'path' => 'attachments/'.fake()->uuid().'.txt',
            'mime_type' => 'text/plain',
            'size' => fake()->numberBetween(100, 5000),
        ];
    }
}
