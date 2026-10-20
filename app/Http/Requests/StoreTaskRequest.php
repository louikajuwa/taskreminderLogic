<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\TaskRules;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    use TaskRules;

    public function authorize(): bool
    {
        return $this->user()->can('create', Task::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->taskRules();
    }
}
