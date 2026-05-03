/**
 * usePendingTasks Hook
 * Manages pending task fetching, polling, and real-time updates
 * Used by ParentMobileKinetic and other parent screens
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  approvePendingTask,
  fetchPendingTasks,
  rejectPendingTask,
} from '../api/parentApi.js';

const POLLING_INTERVAL_MS = 10000; // Poll every 10 seconds

/**
 * usePendingTasks Hook
 * @param {string} token - JWT auth token
 * @param {boolean} enabled - Whether to enable polling (default: true)
 * @returns {Object} - { tasks, loading, error, approve, reject, refresh }
 */
export function usePendingTasks(token, enabled = true) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Fetch pending tasks
  const fetchTasks = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await fetchPendingTasks(token);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pending tasks:', err);
      setError(err?.message || 'Failed to fetch pending tasks');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch + setup polling
  useEffect(() => {
    if (!enabled || !token) return;

    setLoading(true);
    fetchTasks();

    // Setup polling
    pollingIntervalRef.current = setInterval(() => {
      fetchTasks();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [token, enabled, fetchTasks]);

  // Approve a task
  const approve = useCallback(
    async (taskId, options = {}) => {
      try {
        await approvePendingTask(taskId, token, options);
        // Remove from local list immediately
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        return { success: true };
      } catch (err) {
        console.error('Failed to approve task:', err);
        return { success: false, error: err?.message || 'Approval failed' };
      }
    },
    [token]
  );

  // Reject a task
  const reject = useCallback(
    async (taskId, options = {}) => {
      try {
        await rejectPendingTask(taskId, token, options);
        // Remove from local list immediately
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        return { success: true };
      } catch (err) {
        console.error('Failed to reject task:', err);
        return { success: false, error: err?.message || 'Rejection failed' };
      }
    },
    [token]
  );

  // Manual refresh (stop polling, fetch once, resume polling)
  const refresh = useCallback(async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setLoading(true);
    await fetchTasks();

    if (enabled && token) {
      pollingIntervalRef.current = setInterval(() => {
        fetchTasks();
      }, POLLING_INTERVAL_MS);
    }
  }, [enabled, token, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    approve,
    reject,
    refresh,
  };
}

export default usePendingTasks;
