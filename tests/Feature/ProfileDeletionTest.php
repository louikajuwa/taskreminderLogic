<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_an_account_removes_the_attachment_directory(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)->post(route('tasks.store'), [
            'title' => 'With file',
            'status' => 'pending',
            'priority' => 'low',
            'attachments' => [UploadedFile::fake()->createWithContent('a.txt', 'hi')],
        ]);
        $path = $user->tasks()->first()->attachments()->first()->path;
        Storage::disk('local')->put("attachments/{$other->id}/keep.txt", 'keep');
        Storage::disk('local')->assertExists($path);

        $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        Storage::disk('local')->assertMissing($path);
        $this->assertFalse(Storage::disk('local')->exists("attachments/{$user->id}"));
        Storage::disk('local')->assertExists("attachments/{$other->id}/keep.txt");
    }
}
