<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\TaskRules;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    use TaskRules;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('task'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->taskRules($this->route('task')->attachments()->count());
    }
}
