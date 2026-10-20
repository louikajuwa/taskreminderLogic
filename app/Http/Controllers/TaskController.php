<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class TaskController extends Controller
{
    /**
     * Filterable, sortable, paginated list view. Invalid query parameters
     * silently fall back to their defaults.
     */
    public function index(Request $request): Response
    {
        $query = $this->filteredQuery($request);

        $status = $this->enumParam($request, 'status', Task::STATUSES);
        if ($status !== '') {
            $query->where('status', $status);
        }

        $overdue = $request->boolean('overdue');
        if ($overdue) {
            $query->overdue();
        }

        $sortable = ['title', 'status', 'priority', 'due_date', 'created_at'];
        $sort = $this->enumParam($request, 'sort', $sortable) ?: 'created_at';
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';

        if ($sort === 'priority') {
            // Order by semantic importance rather than alphabetically (portable across MySQL/SQLite).
            $query->orderByRaw("CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 0 END {$direction}");
        } else {
            $query->orderBy($sort, $direction);
        }

        $tasks = $query->paginate(10)->withQueryString();

        return Inertia::render('Tasks/Index', [
            'tasks' => $tasks,
            'filters' => [
                'search' => $this->searchTerm($request),
                'status' => $status,
                'priority' => $this->enumParam($request, 'priority', Task::PRIORITIES),
                'overdue' => $overdue,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'statuses' => Task::STATUSES,
            'priorities' => Task::PRIORITIES,
        ]);
    }

    /**
     * Kanban board grouped by status.
     */
    public function board(Request $request): Response
    {
        $tasks = $this->filteredQuery($request)
            ->orderBy('position')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('status');

        $columns = collect(Task::STATUSES)->mapWithKeys(
            fn (string $status) => [$status => $tasks->get($status, collect())->values()],
        );

        return Inertia::render('Tasks/Board', [
            'columns' => $columns,
            'filters' => [
                'search' => $this->searchTerm($request),
                'priority' => $this->enumParam($request, 'priority', Task::PRIORITIES),
            ],
            'statuses' => Task::STATUSES,
            'priorities' => Task::PRIORITIES,
        ]);
    }

    public function store(StoreTaskRequest $request)
    {
        $data = $request->safe()->except('attachments');

        if (($data['status'] ?? null) === 'completed') {
            $data['completed_at'] = now();
        }

        $this->withStoredFiles(function (array &$stored) use ($request, $data) {
            $task = $request->user()->tasks()->create($data);
            $this->storeAttachments($request, $task, $stored);
        });

        return back()->with('success', 'Task created successfully.');
    }

    public function update(UpdateTaskRequest $request, Task $task)
    {
        $data = $request->safe()->except('attachments');

        if ($data['status'] === 'completed' && $task->status !== 'completed') {
            $data['completed_at'] = now();
        } elseif ($data['status'] !== 'completed') {
            $data['completed_at'] = null;
        }

        $this->withStoredFiles(function (array &$stored) use ($request, $task, $data) {
            $task->fill($data);

            // A new reminder time should be able to fire again.
            if ($task->isDirty('reminder_at')) {
                $task->reminder_dismissed_at = null;
            }

            $task->save();
            $this->storeAttachments($request, $task, $stored);
        });

        return back()->with('success', 'Task updated successfully.');
    }

    /**
     * Lightweight status/position update used by the Kanban board and the
     * "mark complete" toggle. Returns no flash to avoid toast spam on drag.
     */
    public function updateStatus(Request $request, Task $task)
    {
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'status' => ['required', Rule::in(Task::STATUSES)],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($task, $validated) {
            $task = Task::whereKey($task->id)->lockForUpdate()->firstOrFail();
            $oldStatus = $task->status;
            $position = $validated['position'] ?? null;

            $task->update([
                'status' => $validated['status'],
                'completed_at' => $validated['status'] === 'completed'
                    ? ($task->completed_at ?? now())
                    : null,
            ]);

            if ($position === null && $oldStatus === $validated['status']) {
                return;
            }

            // Re-sequence the target column with the task inserted at the requested slot.
            $ids = $this->columnIds($task, $validated['status'], excluding: $task->id);
            array_splice($ids, min($position ?? count($ids), count($ids)), 0, [$task->id]);
            $this->writePositions($ids);

            if ($oldStatus !== $validated['status']) {
                $this->writePositions($this->columnIds($task, $oldStatus));
            }
        });

        return back(303);
    }

    public function dismissReminder(Task $task)
    {
        Gate::authorize('update', $task);

        $task->forceFill(['reminder_dismissed_at' => now()])->save();

        return back()->with('success', 'Reminder dismissed.');
    }

    public function destroy(Task $task)
    {
        Gate::authorize('delete', $task);

        $task->load('attachments');
        $paths = $task->attachments->pluck('path')->all();

        DB::transaction(fn () => $task->delete());

        // Only remove files once the rows are gone.
        Storage::disk('local')->delete($paths);

        return back()->with('success', 'Task deleted successfully.');
    }

    /**
     * Build the base query scoped to the authenticated user, applying the
     * search and priority filters shared by the list and board views.
     */
    private function filteredQuery(Request $request)
    {
        $query = $request->user()->tasks()->with('attachments');

        $search = $this->searchTerm($request);
        if ($search !== '') {
            // Escape LIKE wildcards so user input is matched literally ("!" is the escape char).
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->whereRaw("title LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("description LIKE ? ESCAPE '!'", [$like]);
            });
        }

        $priority = $this->enumParam($request, 'priority', Task::PRIORITIES);
        if ($priority !== '') {
            $query->where('priority', $priority);
        }

        return $query;
    }

    private function searchTerm(Request $request): string
    {
        $search = $request->input('search');

        return is_string($search) ? mb_substr(trim($search), 0, 100) : '';
    }

    /**
     * @param  list<string>  $allowed
     */
    private function enumParam(Request $request, string $key, array $allowed): string
    {
        $value = $request->input($key);

        return is_string($value) && in_array($value, $allowed, true) ? $value : '';
    }

    /**
     * IDs of a user's tasks in a status column, in board display order.
     *
     * @return list<int>
     */
    private function columnIds(Task $task, string $status, ?int $excluding = null): array
    {
        return Task::where('user_id', $task->user_id)
            ->where('status', $status)
            ->when($excluding, fn ($q) => $q->where('id', '!=', $excluding))
            ->lockForUpdate()
            ->orderBy('position')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->pluck('id')
            ->all();
    }

    /**
     * Assign 0..n positions with plain query updates (no model events).
     *
     * @param  list<int>  $ids
     */
    private function writePositions(array $ids): void
    {
        foreach ($ids as $position => $id) {
            Task::whereKey($id)->where('position', '!=', $position)->toBase()->update(['position' => $position]);
        }
    }

    /**
     * Run a write inside a transaction; if it fails, remove any files it stored.
     *
     * @param  callable(array<int, string>&): void  $callback
     */
    private function withStoredFiles(callable $callback): void
    {
        $stored = [];

        try {
            DB::transaction(function () use ($callback, &$stored) {
                $callback($stored);
            });
        } catch (Throwable $e) {
            Storage::disk('local')->delete($stored);

            throw $e;
        }
    }

    /**
     * Persist uploaded files on the private disk and link them to the task.
     *
     * @param  array<int, string>  $stored  Collects stored paths for cleanup on failure.
     */
    private function storeAttachments(Request $request, Task $task, array &$stored): void
    {
        if (! $request->hasFile('attachments')) {
            return;
        }

        foreach ($request->file('attachments') as $file) {
            $path = $file->store("attachments/{$task->user_id}", 'local');
            $stored[] = $path;

            $task->attachments()->create([
                'user_id' => $task->user_id,
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        }
    }
}
