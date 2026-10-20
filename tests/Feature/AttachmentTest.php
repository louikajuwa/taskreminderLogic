<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge(['title' => 'T', 'status' => 'pending', 'priority' => 'low'], $overrides);
    }

    private function textFile(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, 'hello '.$name);
    }

    public function test_cross_user_attachment_delete_and_download_are_forbidden(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $task = Task::factory()->for($owner)->create();
        Storage::disk('local')->put('attachments/x.txt', 'data');
        $attachment = Attachment::factory()->for($task)->create(['user_id' => $owner->id, 'path' => 'attachments/x.txt']);

        $other = User::factory()->create();
        $this->actingAs($other)->get(route('attachments.download', $attachment))->assertForbidden();
        $this->actingAs($other)->delete(route('attachments.destroy', $attachment))->assertForbidden();

        Storage::disk('local')->assertExists('attachments/x.txt');
        $this->assertDatabaseHas('attachments', ['id' => $attachment->id]);
    }

    public function test_owner_can_delete_an_attachment_and_its_file(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $task = Task::factory()->for($owner)->create();
        Storage::disk('local')->put('attachments/x.txt', 'data');
        $attachment = Attachment::factory()->for($task)->create(['user_id' => $owner->id, 'path' => 'attachments/x.txt']);

        $this->actingAs($owner)->delete(route('attachments.destroy', $attachment))->assertRedirect();

        $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
        Storage::disk('local')->assertMissing('attachments/x.txt');
    }

    public function test_attachment_cap_counts_existing_files_on_update(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();
        Attachment::factory(9)->for($task)->create(['user_id' => $user->id]);

        $this->actingAs($user)->put(route('tasks.update', $task), $this->payload([
            'attachments' => [$this->textFile('a.txt'), $this->textFile('b.txt')],
        ]))->assertSessionHasErrors('attachments');

        $this->assertSame(9, $task->attachments()->count());

        $this->actingAs($user)->put(route('tasks.update', $task), $this->payload([
            'attachments' => [$this->textFile('a.txt')],
        ]))->assertSessionDoesntHaveErrors();

        $this->assertSame(10, $task->attachments()->count());
    }

    public function test_server_detected_mime_type_is_stored_instead_of_client_claim(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $tmp = tempnam(sys_get_temp_dir(), 'att');
        file_put_contents($tmp, 'just some plain text');
        $file = new UploadedFile($tmp, 'notes.txt', 'application/x-evil', null, true);

        $this->actingAs($user)->post(route('tasks.store'), $this->payload(['attachments' => [$file]]))
            ->assertSessionDoesntHaveErrors();

        $this->assertSame('text/plain', Attachment::first()->mime_type);
    }

    public function test_deleting_a_task_removes_its_files(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('tasks.store'), $this->payload([
            'attachments' => [$this->textFile('a.txt'), $this->textFile('b.txt')],
        ]));

        $task = $user->tasks()->first();
        $paths = $task->attachments->pluck('path');
        $this->assertCount(2, $paths);
        $paths->each(fn ($p) => Storage::disk('local')->assertExists($p));

        $this->actingAs($user)->delete(route('tasks.destroy', $task))->assertRedirect();

        $paths->each(fn ($p) => Storage::disk('local')->assertMissing($p));
        $this->assertDatabaseCount('attachments', 0);
    }
}
