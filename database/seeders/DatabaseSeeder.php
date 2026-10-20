<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with a demo account and sample tasks.
     */
    public function run(): void
    {
        $demo = User::factory()->create([
            'name' => 'Demo User',
            'email' => 'demo@example.com',
        ]);

        Task::factory(15)->for($demo)->create();

        // A second account demonstrates that data stays isolated per user.
        $other = User::factory()->create([
            'name' => 'Second User',
            'email' => 'second@example.com',
        ]);

        Task::factory(5)->for($other)->create();
    }
}
