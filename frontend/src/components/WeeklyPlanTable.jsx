import { useState } from 'react';
import { apiRequest } from '../api/client.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Neutral category stripes (brutalist grayscale, no SaaS accent colors). */
const CAT_COLORS = {
  school: '#111827',
  chores: '#374151',
  activities: '#6b7280',
  health: '#9ca3af',
  other: '#4b5563',
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
    <section className="font-sans mt-6 border-2 border-black bg-white p-6 text-black">
      <div className="mb-6 flex flex-col gap-2 border-b-2 border-black pb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-tight text-black">Weekly Plan</h2>
          <p className="mt-1 text-sm text-gray-600">
            Recurring tasks by day — drag a chip to add or remove days.
          </p>
        </div>
        {busy ? (
          <span className="text-sm font-medium text-gray-600" aria-live="polite">
            Saving…
          </span>
        ) : null}
      </div>

      <div className="grid min-h-[160px] grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isOver = dragOverDay === day;
          return (
            <div
              key={day}
              className={`flex min-h-[140px] flex-col overflow-hidden border-2 bg-gray-50 transition ${
                isOver ? 'border-black bg-gray-100 ring-2 ring-black ring-offset-2 ring-offset-white' : 'border-black'
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
              <div className="border-b-2 border-black bg-white px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-black font-mono">
                {day}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2">
                {dayTasks.length === 0 && (
                  <div className="flex min-h-[48px] flex-1 items-center justify-center border-2 border-dashed border-gray-400 text-[11px] text-gray-600">
                    Drop here
                  </div>
                )}
                {dayTasks.map((task) => {
                  const cat = CAT_COLORS[task.category || 'other'];
                  return (
                    <div
                      key={task.id}
                      className={`group flex min-w-0 cursor-grab items-center gap-1 border-2 border-black bg-white py-1 pl-1.5 pr-1 text-xs transition hover:bg-gray-50 ${
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
                      <span className="min-w-0 flex-1 truncate font-medium text-black">
                        {task.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-gray-600">
                        {task.childName?.split(' ')[0]}
                      </span>
                      <button
                        type="button"
                        className="ml-0.5 hidden h-6 w-6 shrink-0 items-center justify-center border border-black bg-white text-sm font-bold text-black hover:bg-black hover:text-white group-hover:flex"
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
        <div className="mt-6 border-t-2 border-black pt-6">
          <span className="mb-2 block font-mono text-xs font-bold uppercase tracking-wide text-gray-600">
            Unscheduled — drag onto a day to schedule
          </span>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((task) => {
              const cat = CAT_COLORS[task.category || 'other'];
              return (
                <div
                  key={task.id}
                  className={`group flex max-w-[180px] min-w-0 cursor-grab items-center gap-1 border-2 border-black bg-white py-1 pl-1.5 pr-1 text-xs transition hover:bg-gray-50 ${
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
                  <span className="min-w-0 flex-1 truncate font-medium text-black">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-gray-600">
                    {task.childName?.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTasks.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-600">
          No active tasks yet. Create tasks in the Tasks section and they will appear here.
        </p>
      )}
    </section>
  );
}
