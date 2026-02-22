/**
 * AI API Client
 *
 * Centralized fetch wrapper for all /api/* calls.
 * Automatically injects the `x-offline-mode` header when
 * the Zustand store's offlineMode setting is enabled.
 *
 * Usage:
 *   import { aiPost } from '../lib/aiClient';
 *   const data = await aiPost('/api/generate-soap', { patientName, ... }, offlineMode);
 */

/// <reference types="vite/client" />

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * POST to an AI endpoint with automatic offline mode header.
 *
 * @param path      — e.g. '/api/generate-soap'
 * @param body      — JSON request body
 * @param offline   — whether offline mode is enabled (from store)
 * @returns         — parsed { success, data } response
 * @throws          — on network/server error
 */
export async function aiPost<T = any>(
  path: string,
  body: Record<string, any>,
  offline: boolean = false,
): Promise<{ success: boolean; data: T; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (offline) {
    headers['x-offline-mode'] = 'true';
    console.log(`📴 [Offline Mode] POST ${path}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Request to ${path} failed`);
  }

  return data;
}

/**
 * GET from an AI endpoint with automatic offline mode header.
 */
export async function aiGet<T = any>(
  path: string,
  offline: boolean = false,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (offline) {
    headers['x-offline-mode'] = 'true';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  return response.json();
}
