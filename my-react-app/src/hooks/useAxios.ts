import { useState, useCallback, useMemo } from 'react';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const baseURL = import.meta.env.VITE_BACKENED_API;

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
});

/**
 * useAxios hook
 * Returns:
 *   - axios: the axios instance
 *   - loading: boolean (true while a request is in progress)
 *   - request: a function to make requests with loading state
 * Usage:
 *   const { axios, loading, request } = useAxios();
 *   const fetchData = async () => {
 *     try {
 *       const res = await request({ method: 'get', url: '/endpoint' });
 *     } catch (err) { ... }
 *   }
 */
export function useAxios() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async <T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    setLoading(true);
    try {
      const response = await axiosInstance.request<T>(config);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    axios: axiosInstance,
    loading,
    request,
  }), [loading, request]);
}
