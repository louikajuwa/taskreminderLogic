<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $now = now();

        // One aggregate query, computed live because "overdue" depends on the clock.
        $row = $request->user()->tasks()->toBase()->selectRaw(
            "COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
            COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
            COALESCE(SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END), 0) as pending,
            COALESCE(SUM(CASE WHEN status != 'completed' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END), 0) as overdue",
            [$now],
        )->first();

        $stats = [
            'total' => (int) $row->total,
            'completed' => (int) $row->completed,
            'in_progress' => (int) $row->in_progress,
            'pending' => (int) $row->pending,
            'overdue' => (int) $row->overdue,
        ];

        $overdueTasks = $request->user()->tasks()->overdue()
            ->orderBy('due_date')
            ->limit(5)
            ->get(['id', 'title', 'priority', 'status', 'due_date']);

        $upcomingTasks = $request->user()->tasks()
            ->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '>=', $now)
            ->orderBy('due_date')
            ->limit(5)
            ->get(['id', 'title', 'priority', 'status', 'due_date', 'reminder_at']);

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'overdueTasks' => $overdueTasks,
            'upcomingTasks' => $upcomingTasks,
        ]);
    }
}
