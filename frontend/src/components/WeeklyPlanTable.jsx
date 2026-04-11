import { useState } from 'react';
import { apiRequest } from '../api/client.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CAT_COLORS = {
  school:     '#4b8ff5',
  chores:     '#34c77b',
  activities: '#f58c4b',
  health:     '#e05c5c',
  other:      '#8e8e9c',
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
  const [draggedId,  setDraggedId]  = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [busy, setBusy] = useState(false);

  /* Active tasks only */
  const activeTasks = tasks.filter((t) => t.state === 'Active');

  function getTasksForDay(day) {
    return activeTasks.filter((t) => dayInRecurrence(t.recurrenceDays, day));
  }

  function getUnscheduled() {
    return activeTasks.filter((t) => !t.recurrenceDays);
  }

  /* ── Handle drop: toggle the dragged day on/off for this task ── */
  async function handleDrop(day) {
    if (!draggedId) return;
    const task = activeTasks.find((t) => t.id === draggedId);
    if (!task) return;

    const current = buildDayOrder(task.recurrenceDays);
    let next;
    if (current.includes(day)) {
      /* Dropping onto a day already scheduled → remove it */
      next = current.filter((d) => d !== day);
    } else {
      /* Dropping onto a new day → add it */
      next = DAYS.filter((d) => [...current, day].includes(d));
    }
    const recurrenceDays = next.length > 0 ? next.join(',') : null;

    setBusy(true);
    try {
      await apiRequest(`/tasks/${draggedId}/schedule`, {
        method: 'PATCH',
        token,
        body: { recurrenceDays }
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

  /* ── Remove a task from a specific day (click the ×) ── */
  async function removeFromDay(task, day) {
    const current = buildDayOrder(task.recurrenceDays);
    const next = current.filter((d) => d !== day);
    const recurrenceDays = next.length > 0 ? next.join(',') : null;
    setBusy(true);
    try {
      await apiRequest(`/tasks/${task.id}/schedule`, {
        method: 'PATCH',
        token,
        body: { recurrenceDays }
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
    <section className="panel weekly-plan-panel">
      <div className="panel-top">
        <div>
          <h2>Weekly Plan</h2>
          <p className="section-subtitle">
            Recurring tasks by day — drag a chip to add or remove days.
          </p>
        </div>
        {busy && <span className="notice" aria-live="polite">Saving…</span>}
      </div>

      {/* ── Day columns ── */}
      <div className="weekly-plan-grid">
        {DAYS.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isOver = dragOverDay === day;
          return (
            <div
              key={day}
              className={`weekly-day-col${isOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(day); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={() => { handleDrop(day); setDragOverDay(null); }}
            >
              <div className="weekly-day-header">{day}</div>
              <div className="weekly-day-tasks">
                {dayTasks.length === 0 && (
                  <div className="weekly-drop-hint">Drop here</div>
                )}
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`weekly-task-chip${draggedId === task.id ? ' dragging' : ''}`}
                    style={{ '--cat': CAT_COLORS[task.category || 'other'] }}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverDay(null); }}
                    title={`${task.childName}: ${task.title} — ${task.points} RP`}
                  >
                    <span className="chip-dot" aria-hidden="true" />
                    <span className="chip-title">{task.title}</span>
                    <span className="chip-child">{task.childName?.split(' ')[0]}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label={`Remove ${task.title} from ${day}`}
                      onClick={(e) => { e.stopPropagation(); removeFromDay(task, day); }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Unscheduled tasks pool ── */}
      {unscheduled.length > 0 && (
        <div className="weekly-unscheduled">
          <span className="section-label">Unscheduled — drag onto a day to schedule</span>
          <div className="weekly-unscheduled-chips">
            {unscheduled.map((task) => (
              <div
                key={task.id}
                className={`weekly-task-chip unscheduled${draggedId === task.id ? ' dragging' : ''}`}
                style={{ '--cat': CAT_COLORS[task.category || 'other'] }}
                draggable
                onDragStart={() => setDraggedId(task.id)}
                onDragEnd={() => { setDraggedId(null); setDragOverDay(null); }}
                title={`${task.childName}: ${task.title} — ${task.points} RP`}
              >
                <span className="chip-dot" aria-hidden="true" />
                <span className="chip-title">{task.title}</span>
                <span className="chip-child">{task.childName?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTasks.length === 0 && (
        <p className="text-dim text-center">
          No active tasks yet. Create tasks in the Tasks section and they will appear here.
        </p>
      )}
    </section>
  );
}
