<?php

namespace App\Http\Requests\Concerns;

use App\Models\Task;
use Illuminate\Validation\Rule;

trait TaskRules
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('title'))) {
            $this->merge(['title' => trim($this->input('title'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function taskRules(int $existingAttachments = 0): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(Task::STATUSES)],
            'priority' => ['required', Rule::in(Task::PRIORITIES)],
            'due_date' => ['nullable', 'date'],
            'reminder_at' => [
                'nullable',
                'date',
                Rule::when($this->filled('due_date'), ['before_or_equal:due_date']),
            ],
            'attachments' => ['nullable', 'array', 'max:'.max(0, Task::MAX_ATTACHMENTS - $existingAttachments)],
            'attachments.*' => ['file', 'max:'.config('attachments.max_kb'), 'mimes:'.config('attachments.mimes')],
        ];
    }
}
