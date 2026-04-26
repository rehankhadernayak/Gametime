import { useRef, useState } from 'react';
import { apiRequest, pushDeletionToast } from '../api/client.js';
import StatusChip from './StatusChip.jsx';
import GTConfirmDialog from './GTConfirmDialog.jsx';
import HoldToConfirmButton from './HoldToConfirmButton.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CATEGORIES = [
  { id: 'school',     label: 'School',     color: '#4b8ff5' },
  { id: 'chores',     label: 'Chores',     color: '#34c77b' },
  { id: 'activities', label: 'Activities', color: '#f58c4b' },
  { id: 'health',     label: 'Health',     color: '#e05c5c' },
  { id: 'other',      label: 'Other',      color: '#8e8e9c' },
];

const TEMPLATES = [
  {
    id: 't1', label: '30-min Study',
    title: '30-minute Study Revision',
    description: 'Complete a focused 30-minute revision and share 3 key takeaways.',
    points: 15, gpPoints: 2, category: 'school', recurrenceDays: ['Mon', 'Wed', 'Fri']
  },
  {
    id: 't2', label: 'Daily Exercise',
    title: 'Daily Exercise Challenge',
    description: 'Finish a 20-minute workout or outdoor activity and upload proof.',
    points: 20, gpPoints: 3, category: 'health', recurrenceDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  },
  {
    id: 't3', label: 'Reading Goal',
    title: 'Reading Goal',
    description: 'Read for 25 minutes and write a short 3-line summary.',
    points: 12, gpPoints: 1, category: 'school', recurrenceDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  },
  {
    id: 't4', label: 'Room Reset',
    title: 'Room Reset',
    description: 'Clean and organize your study area so it is ready for tomorrow.',
    points: 18, gpPoints: 2, category: 'chores', recurrenceDays: ['Mon', 'Wed', 'Fri']
  },
  {
    id: 't5', label: 'Homework',
    title: 'Complete Homework',
    description: 'Finish all assigned homework and take a photo of completed work.',
    points: 15, gpPoints: 1, category: 'school', recurrenceDays: ['Mon', 'Tue', 'Wed', 'Thu']
  },
  {
    id: 't6', label: 'Weekly Chores',
    title: 'Weekly Chores',
    description: 'Complete assigned household chores and upload proof of completion.',
    points: 20, gpPoints: 2, category: 'chores', recurrenceDays: ['Sat', 'Sun']
  },
  {
    id: 't7', label: 'Practice',
    title: 'Music / Sports Practice',
    description: 'Complete a full practice session for 30+ minutes and record yourself.',
    points: 20, gpPoints: 3, category: 'activities', recurrenceDays: ['Tue', 'Thu', 'Sat']
  },
];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function CategoryBadge({ category }) {
  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[4];
  return (
    <span className="task-cat-badge" style={{ '--cat-color': cat.color }}>
      {cat.label}
    </span>
  );
}

function RecurrenceChips({ days }) {
  if (!days) return <span className="task-recur-none">One-time</span>;
  const dayList = days.split(',').filter(Boolean);
  return (
    <span className="recur-chips">
      {dayList.map((d) => <span key={d} className="recur-chip">{d}</span>)}
    </span>
  );
}

export default function TaskTable({ token, tasks, children, onRefresh }) {
  const [newRow, setNewRow] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters]       = useState({ childId: '', state: 'ALL', sortBy: 'recent' });
  const [confirmTask, setConfirmTask] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const firstInputRef = useRef(null);

  /* ── Derived task list ── */
  const filteredTasks = (() => {
    let list = [...tasks];
    if (filters.childId) list = list.filter((t) => t.childId === filters.childId);
    if (filters.state !== 'ALL') list = list.filter((t) => t.state === filters.state);
    if (filters.sortBy === 'dueSoon') {
      list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  })();

  const deletableFiltered = filteredTasks.filter((t) => ['Active', 'Draft'].includes(t.state));

  /* ── Open new-task inline row ── */
  function openNewRow() {
    setNewRow({
      childId: children[0]?.id || '',
      title: '',
      description: '',
      points: 10,
      gpPoints: 0,
      dueDate: defaultDueDate(),
      category: 'other',
      recurrenceDays: [],
      templateId: '',
      requiredEvidenceType: 'Photo'
    });
    setError('');
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }

  /* ── Apply a task template ── */
  function applyTemplate(templateId) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setNewRow((prev) => ({
      ...prev,
      templateId,
      title: tpl.title,
      description: tpl.description,
      points: tpl.points,
      gpPoints: tpl.gpPoints,
      category: tpl.category,
      recurrenceDays: tpl.recurrenceDays || []
    }));
  }

  /* ── Toggle a recurrence day checkbox ── */
  function toggleDay(day) {
    setNewRow((prev) => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter((d) => d !== day)
        : [...prev.recurrenceDays, day]
    }));
  }

  /* ── Save new task ── */
  async function saveNewRow() {
    if (!newRow.childId)           { setError('Select a child first.'); return; }
    if (!newRow.title.trim())      { setError('Title is required.'); return; }
    if (!newRow.description.trim()){ setError('Description is required.'); return; }
    const pts = Number(newRow.points);
    if (!Number.isInteger(pts) || pts < 5 || pts > 50) {
      setError('RP must be an integer between 5 and 50.'); return;
    }
    const gp = Number(newRow.gpPoints);
    if (!Number.isInteger(gp) || gp < 0 || gp > 1000) {
      setError('GP must be an integer between 0 and 1000.'); return;
    }
    const dueTs = Date.parse(newRow.dueDate);
    if (!dueTs || dueTs <= Date.now()) {
      setError('Due date must be in the future.'); return;
    }
    if (dueTs > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      setError('Due date must be within 7 days.'); return;
    }

    setSaving(true);
    setError('');
    try {
      // Sort days in correct week order before sending
      const orderedDays = DAYS.filter((d) => newRow.recurrenceDays.includes(d));
      await apiRequest('/tasks/create', {
        method: 'POST',
        token,
        body: {
          childId:       newRow.childId,
          title:         newRow.title.trim(),
          description:   newRow.description.trim(),
          points:        pts,
          gpPoints:      gp,
          dueDate:       new Date(dueTs).toISOString(),
          category:      newRow.category || 'other',
          recurrenceDays: orderedDays.length > 0 ? orderedDays.join(',') : null,
          requiredEvidenceType: newRow.requiredEvidenceType === 'Video' ? 'Video' : 'Photo'
        }
      });
      setNewRow(null);
      await onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete (cancel) task ── */
  async function deleteTask(taskId, taskTitle) {
    setDeletingId(taskId);
    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE', token });
      pushDeletionToast({
        title: 'Quest removed',
        message: taskTitle ? `"${taskTitle}" was deleted.` : 'The quest was deleted.'
      });
      await onRefresh();
    } catch {
      /* silent - onRefresh will show latest state */
    } finally {
      setDeletingId(null);
    }
  }

  function requestDeleteTask(task) {
    setConfirmTask(task);
  }

  async function confirmDeleteTask() {
    if (!confirmTask) return;
    const { id, title } = confirmTask;
    try {
      await deleteTask(id, title);
      setConfirmTask(null);
    } catch {
      setConfirmTask(null);
    }
  }

  async function deleteAllDeletableInView() {
    if (deletableFiltered.length === 0) return;
    setBulkDeleting(true);
    try {
      for (const t of deletableFiltered) {
        await apiRequest(`/tasks/${t.id}`, { method: 'DELETE', token });
      }
      const n = deletableFiltered.length;
      pushDeletionToast({
        title: n === 1 ? 'Quest removed' : 'Quests removed',
        message: n === 1 ? 'One quest was deleted.' : `${n} quests were deleted.`
      });
      await onRefresh();
    } catch {
      await onRefresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <section className="panel">
      <GTConfirmDialog
        open={Boolean(confirmTask)}
        title="Delete Quest?"
        onCancel={() => setConfirmTask(null)}
        onConfirm={confirmDeleteTask}
        confirmBusy={Boolean(confirmTask && deletingId === confirmTask.id)}
        confirmLabel="Confirm Delete"
      />
      <div className="task-table-header panel-top">
        <div>
          <h2>Tasks</h2>
          <p className="section-subtitle">Create and manage tasks for your children.</p>
        </div>
        <div className="task-table-header-actions">
          {deletableFiltered.length > 0 && (
            <HoldToConfirmButton
              label="Delete all in view"
              className="task-bulk-delete-hold"
              disabled={bulkDeleting || Boolean(newRow)}
              aria-label="Hold to delete all active or draft quests shown in the current filters"
              onComplete={deleteAllDeletableInView}
            />
          )}
          {!newRow && (
            <button type="button" className="secondary-button" onClick={openNewRow}>
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="inline-form task-filter-bar">
        <label>
          Child
          <select value={filters.childId} onChange={(e) => setFilters((f) => ({ ...f, childId: e.target.value }))}>
            <option value="">All children</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}>
            <option value="ALL">All</option>
            <option value="Active">Active</option>
            <option value="PendingApproval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
        </label>
        <label>
          Sort
          <select value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}>
            <option value="recent">Most recent</option>
            <option value="dueSoon">Due soon</option>
          </select>
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table className="data-table task-mgmt-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Title &amp; Description</th>
              <th>Child</th>
              <th>Recurrence</th>
              <th>RP</th>
              <th>GP</th>
              <th>Due</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {/* ── Inline new-task row ── */}
            {newRow && (
              <tr className="task-new-row">
                <td>
                  <select
                    className="task-inline-select"
                    value={newRow.category}
                    onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </td>

                <td colSpan={2}>
                  <div className="task-new-inputs">
                    <select
                      className="task-template-select"
                      value={newRow.templateId}
                      onChange={(e) => applyTemplate(e.target.value)}
                    >
                      <option value="">Use template…</option>
                      {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <input
                      ref={firstInputRef}
                      className="task-inline-input"
                      placeholder="Task title *"
                      maxLength={50}
                      value={newRow.title}
                      onChange={(e) => setNewRow((p) => ({ ...p, title: e.target.value }))}
                    />
                    <input
                      className="task-inline-input"
                      placeholder="Description *"
                      maxLength={200}
                      value={newRow.description}
                      onChange={(e) => setNewRow((p) => ({ ...p, description: e.target.value }))}
                    />
                    <select
                      className="task-inline-select"
                      value={newRow.childId}
                      onChange={(e) => setNewRow((p) => ({ ...p, childId: e.target.value }))}
                    >
                      <option value="">Select child *</option>
                      {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="task-proof-inline" role="group" aria-label="Proof required">
                      <span className="task-proof-label">Proof</span>
                      <button
                        type="button"
                        className={`task-proof-chip${newRow.requiredEvidenceType === 'Photo' ? ' active' : ''}`}
                        onClick={() => setNewRow((p) => ({ ...p, requiredEvidenceType: 'Photo' }))}
                      >
                        Photo
                      </button>
                      <button
                        type="button"
                        className={`task-proof-chip${newRow.requiredEvidenceType === 'Video' ? ' active' : ''}`}
                        onClick={() => setNewRow((p) => ({ ...p, requiredEvidenceType: 'Video' }))}
                      >
                        Video
                      </button>
                    </div>
                  </div>
                </td>

                {/* ── Day-of-week checkboxes ── */}
                <td>
                  <div className="recurrence-day-picker">
                    {DAYS.map((day) => (
                      <label
                        key={day}
                        className={`day-chip-label ${newRow.recurrenceDays.includes(day) ? 'active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={newRow.recurrenceDays.includes(day)}
                          onChange={() => toggleDay(day)}
                          className="sr-only"
                        />
                        {day.slice(0, 2)}
                      </label>
                    ))}
                  </div>
                </td>

                <td>
                  <input
                    type="number" min="5" max="50" className="task-inline-num"
                    value={newRow.points}
                    onChange={(e) => setNewRow((p) => ({ ...p, points: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="number" min="0" max="1000" className="task-inline-num"
                    value={newRow.gpPoints}
                    onChange={(e) => setNewRow((p) => ({ ...p, gpPoints: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="datetime-local" className="task-inline-date"
                    value={newRow.dueDate}
                    onChange={(e) => setNewRow((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </td>
                <td><span className="status-chip status-active">New</span></td>
                <td>
                  <div className="task-row-actions">
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={saveNewRow}
                      disabled={saving}
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Cancel"
                      onClick={() => { setNewRow(null); setError(''); }}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {filteredTasks.length === 0 && !newRow && (
              <tr>
                <td colSpan={9} className="empty-row">
                  No tasks match your filters. Click <strong>+ Add Task</strong> to create one.
                </td>
              </tr>
            )}

            {/* ── Existing task rows ── */}
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className={deletingId === task.id ? 'row-deleting' : ''}
              >
                <td><CategoryBadge category={task.category || 'other'} /></td>
                <td>
                  <strong className="task-title-cell">{task.title}</strong>
                  {task.requiredEvidenceType && (
                    <span className="task-proof-badge">{task.requiredEvidenceType} proof</span>
                  )}
                  {task.description && (
                    <div className="task-desc-sub">{task.description}</div>
                  )}
                </td>
                <td>{task.childName}</td>
                <td><RecurrenceChips days={task.recurrenceDays} /></td>
                <td>{task.points}</td>
                <td>{task.gpPoints ?? 0}</td>
                <td className="text-small">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                </td>
                <td><StatusChip state={task.state} /></td>
                <td>
                  {['Active', 'Draft'].includes(task.state) && (
                    <button
                      type="button"
                      className="icon-button danger-hover"
                      title="Delete task"
                      aria-label={`Delete task ${task.title}`}
                      onClick={() => requestDeleteTask(task)}
                      disabled={deletingId === task.id}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
