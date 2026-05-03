/**
 * Parent-specific API service
 * Handles all parent-related API calls (pending tasks, approvals, rejections, etc.)
 */

import { apiRequest } from './client.js';

/**
 * Fetch pending tasks awaiting parent approval
 * @param {string} token - JWT auth token
 * @returns {Promise<Array>} - Array of pending tasks
 */
export async function fetchPendingTasks(token) {
  return apiRequest('/tasks/pending', { token });
}

/**
 * Approve a task completion
 * @param {string} taskId - Task ID
 * @param {string} token - JWT auth token
 * @param {Object} options - Optional { parentNote }
 * @returns {Promise<Object>} - Approval response
 */
export async function approvePendingTask(taskId, token, options = {}) {
  return apiRequest('/tasks/approve', {
    method: 'POST',
    token,
    body: {
      taskId,
      parentNote: options.parentNote || '',
    },
  });
}

/**
 * Reject a task completion with optional note
 * @param {string} taskId - Task ID
 * @param {string} token - JWT auth token
 * @param {Object} options - Optional { parentNote }
 * @returns {Promise<Object>} - Rejection response
 */
export async function rejectPendingTask(taskId, token, options = {}) {
  return apiRequest('/tasks/reject', {
    method: 'POST',
    token,
    body: {
      taskId,
      parentNote: options.parentNote || 'Please resubmit evidence.',
    },
  });
}

/**
 * Fetch parent profile including children
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>} - { id, name, email, children[] }
 */
export async function fetchParentProfile(token) {
  return apiRequest('/auth/parent-profile', { token });
}

/**
 * Create a new task
 * @param {string} token - JWT auth token
 * @param {Object} taskData - { title, description, points, gp_points, dueDate, childId, category, recurrenceDays }
 * @returns {Promise<Object>} - Created task object
 */
export async function createNewTask(token, taskData) {
  return apiRequest('/tasks/create', {
    method: 'POST',
    token,
    body: taskData,
  });
}

/**
 * Fetch submission details (full task + completion + evidence for review)
 * @param {string} taskId - Task ID
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>} - Task submission details
 */
export async function fetchSubmissionDetails(taskId, token) {
  return apiRequest(`/tasks/${taskId}/submission`, { token });
}

/**
 * Get AI insights for parent
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>} - AI insights/recommendations
 */
export async function fetchParentInsights(token) {
  return apiRequest('/ai/parent/insights', { token });
}

/**
 * Get weekly gaming report for a child
 * @param {string} childId - Child ID
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>} - Weekly gaming stats
 */
export async function fetchWeeklyGamingReport(childId, token) {
  return apiRequest(`/gaming/reports/weekly?childId=${childId}`, { token });
}

/**
 * Get parent's giftcard balance summary
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>} - { parentGpBalance, children[] }
 */
export async function fetchGpBalance(token) {
  return apiRequest('/giftcards/gp/summary', { token });
}
