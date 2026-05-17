import { useState } from 'react';
import { apiRequest } from '../api/client.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Muted category accents (SaaS palette, not neon) */
const CAT_COLORS = {
  school: '#6366f1',
  chores: '#059669',
  activities: '#7c3aed',
  health: '#e11d48',
  other: '#64748b',
};

function dayInRecurrence(recurrenceDays, day) {
  if (!recurrenceDays) return false;
  return recurrenceDays.split(',').map((d) => d.trim()).includes(day);
}

function buildDayOrder(daysString) {
  const current = daysString ? daysString.split(',').filter(Boolean) : [];
  return DAYS.filter((d) => current.includes(d));
}

export default function WeeklyPlanTable({ token, tasks, onRefresh }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [busy, setBusy] = useState(false);

  const activeTasks = tasks.filter((t) => t.state === 'Active');

  function getTasksForDay(day) {
    return activeTasks.filter((t) => dayInRecurrence(t.recurrenceDays, day));
  }

  function getUnscheduled() {
    return activeTasks.filter((t) => !t.recurrenceDays);
  }

  async function handleDrop(day) {
    if (!draggedId) return;
    const task = activeTasks.find((t) => t.id === draggedId);
    if (!task) return;

    const current = buildDayOrder(task.recurrenceDays);
    let next;
    if (current.includes(day)) {
      next = current.filter((d) => d !== day);
    } else {
      next = DAYS.filter((d) => [...current, day].includes(d));
    }
    const recurrenceDays = next.length > 0 ? next.join(',') : null;

    setBusy(true);
    try {
      await apiRequest(`/tasks/${draggedId}/schedule`, {
        method: 'PATCH',
        token,
        body: { recurrenceDays },
      });
      await onRefresh();
    } catch {
      /* silent */
    } finally {
      setBusy(false);
      setDraggedId(null);
      setDragOverDay(null);
    }
  }

  async function removeFromDay(task, day) {
    const current = buildDayOrder(task.recurrenceDays);
    const next = current.filter((d) => d !== day);
    const recurrenceDays = next.length > 0 ? next.join(',') : null;
    setBusy(true);
    try {
      await apiRequest(`/tasks/${task.id}/schedule`, {
        method: 'PATCH',
        token,
        body: { recurrenceDays },
      });
      await onRefresh();
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  }

  const unscheduled = getUnscheduled();

  return (
    <section className="font-sans mt-6 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm md:p-6 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Weekly Plan</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Recurring tasks by day — drag a chip to add or remove days.
          </p>
        </div>
        {busy ? (
          <span className="text-sm font-medium text-violet-600 dark:text-violet-400" aria-live="polite">
            Saving…
          </span>
        ) : null}
      </div>

      <div className="grid min-h-[160px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isOver = dragOverDay === day;
          return (
            <div
              key={day}
              className={`flex min-h-[140px] flex-col overflow-hidden rounded-xl border bg-slate-50/90 shadow-sm transition dark:bg-slate-950/40 ${
                isOver
                  ? 'border-violet-400 ring-2 ring-violet-400/80 ring-offset-2 ring-offset-white dark:border-violet-500 dark:ring-violet-500/60 dark:ring-offset-slate-900'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(day);
              }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={() => {
                handleDrop(day);
                setDragOverDay(null);
              }}
            >
              <div className="border-b border-slate-200 bg-white px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                {day}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2">
                {dayTasks.length === 0 && (
                  <div className="flex min-h-[48px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400 dark:border-slate-600 dark:text-slate-500">
                    Drop here
                  </div>
                )}
                {dayTasks.map((task) => {
                  const cat = CAT_COLORS[task.category || 'other'];
                  return (
                    <div
                      key={task.id}
                      className={`group flex min-w-0 cursor-grab items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-1.5 pr-1 text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 ${
                        draggedId === task.id ? 'opacity-50' : ''
                      }`}
                      style={{ borderLeftWidth: 3, borderLeftColor: cat }}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverDay(null);
                      }}
                      title={`${task.childName}: ${task.title} - ${task.points} RP`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">
                        {task.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {task.childName?.split(' ')[0]}
                      </span>
                      <button
                        type="button"
                        className="ml-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-rose-600 hover:bg-rose-100 group-hover:flex dark:text-rose-400 dark:hover:bg-rose-950/60"
                        aria-label={`Remove ${task.title} from ${day}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromDay(task, day);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Unscheduled — drag onto a day to schedule
          </span>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((task) => {
              const cat = CAT_COLORS[task.category || 'other'];
              return (
                <div
                  key={task.id}
                  className={`group flex max-w-[180px] min-w-0 cursor-grab items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-1.5 pr-1 text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 ${
                    draggedId === task.id ? 'opacity-50' : ''
                  }`}
                  style={{ borderLeftWidth: 3, borderLeftColor: cat }}
                  draggable
                  onDragStart={() => setDraggedId(task.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverDay(null);
                  }}
                  title={`${task.childName}: ${task.title} - ${task.points} RP`}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {task.childName?.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTasks.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No active tasks yet. Create tasks in the Tasks section and they will appear here.
        </p>
      )}
    </section>
  );
}
