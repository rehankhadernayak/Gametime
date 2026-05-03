/**
 * useParentProfile Hook
 * Fetches and caches parent profile including children list
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchParentProfile } from '../api/parentApi.js';

/**
 * useParentProfile Hook
 * @param {string} token - JWT auth token
 * @returns {Object} - { parentData, loading, error, refresh }
 */
export function useParentProfile(token) {
  const [parentData, setParentData] = useState({
    id: '',
    name: 'Parent',
    email: '',
    children: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch parent profile
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const data = await fetchParentProfile(token);
      setParentData(data || { id: '', name: 'Parent', email: '', children: [] });
    } catch (err) {
      console.error('Failed to fetch parent profile:', err);
      setError(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount or token change
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  return {
    parentData,
    loading,
    error,
    refresh: fetchProfile,
  };
}

export default useParentProfile;
