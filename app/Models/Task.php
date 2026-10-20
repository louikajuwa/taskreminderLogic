<?php

namespace App\Models;

use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'status', 'priority', 'due_date', 'reminder_at', 'completed_at', 'position'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    public const STATUSES = ['pending', 'in_progress', 'completed'];

    public const PRIORITIES = ['low', 'medium', 'high'];

    public const MAX_ATTACHMENTS = 10;

    /**
     * Attributes appended to the model's array/JSON form.
     *
     * @var list<string>
     */
    protected $appends = ['is_overdue'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'datetime',
            'reminder_at' => 'datetime',
            'reminder_dismissed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Whether the task is past its due date and not yet completed.
     */
    protected function isOverdue(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->due_date !== null
                && $this->status !== 'completed'
                && $this->due_date->isPast(),
        );
    }

    /**
     * Open, non-completed tasks past their due date.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function overdue(Builder $query): void
    {
        $query->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now());
    }

    /**
     * Reminders that have fired and have not been dismissed or completed.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function dueReminders(Builder $query): void
    {
        $query->whereNotNull('reminder_at')
            ->where('reminder_at', '<=', now())
            ->where('status', '!=', 'completed')
            ->whereNull('reminder_dismissed_at')
            ->orderBy('reminder_at');
    }
}
