'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';

interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  schedule: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunSummary: {
    totalRecordsProcessed: number;
    tables: Array<{
      table: string;
      recordsDeleted: number;
      retentionDays: number;
      executionTimeMs: number;
    }>;
    error?: string;
  } | null;
}

interface HealthCheck {
  status: string;
  checks: {
    cleanup_scheduler?: SchedulerStatus;
    database?: {
      status: string;
      latency_ms: number;
    };
    memory?: {
      status: string;
      used_percent: number;
      free_mb: number;
    };
  };
}

export default function SystemPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health/detailed`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading system status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">System Health & Maintenance</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {health && (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">System Status</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Overall system health and component status
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  <dl>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Overall Status</dt>
                      <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            health.status === 'healthy'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {health.status.toUpperCase()}
                        </span>
                      </dd>
                    </div>
                    {health.checks.database && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Database</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${
                            health.checks.database.status === 'ok'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {health.checks.database.status.toUpperCase()}
                          </span>
                          <span className="text-gray-600">
                            Latency: {health.checks.database.latency_ms}ms
                          </span>
                        </dd>
                      </div>
                    )}
                    {health.checks.memory && (
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Memory</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${
                            health.checks.memory.status === 'ok'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {health.checks.memory.status.toUpperCase()}
                          </span>
                          <span className="text-gray-600">
                            {health.checks.memory.used_percent.toFixed(1)}% used ({health.checks.memory.free_mb}MB free)
                          </span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Database Cleanup Scheduler */}
              {health.checks.cleanup_scheduler && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Database Cleanup Scheduler
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Automated retention policy execution status
                    </p>
                  </div>
                  <div className="border-t border-gray-200">
                    <dl>
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Scheduler Status</dt>
                        <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              health.checks.cleanup_scheduler.enabled && !health.checks.cleanup_scheduler.running
                                ? 'bg-green-100 text-green-800'
                                : health.checks.cleanup_scheduler.running
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {health.checks.cleanup_scheduler.running
                              ? 'RUNNING'
                              : health.checks.cleanup_scheduler.enabled
                              ? 'ENABLED'
                              : 'DISABLED'}
                          </span>
                        </dd>
                      </div>
                      {health.checks.cleanup_scheduler.schedule && (
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">Schedule</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {health.checks.cleanup_scheduler.schedule}
                          </dd>
                        </div>
                      )}
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Next Run</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {formatDate(health.checks.cleanup_scheduler.nextRunAt)}
                        </dd>
                      </div>
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Last Run</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {formatDate(health.checks.cleanup_scheduler.lastRunAt)}
                        </dd>
                      </div>
                      {health.checks.cleanup_scheduler.lastRunSummary && (
                        <>
                          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Last Run Summary</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                              {health.checks.cleanup_scheduler.lastRunSummary.error ? (
                                <span className="text-red-600">
                                  Error: {health.checks.cleanup_scheduler.lastRunSummary.error}
                                </span>
                              ) : (
                                <span className="font-semibold">
                                  {health.checks.cleanup_scheduler.lastRunSummary.totalRecordsProcessed.toLocaleString()}{' '}
                                  records processed
                                </span>
                              )}
                            </dd>
                          </div>
                          {health.checks.cleanup_scheduler.lastRunSummary.tables.length > 0 && (
                            <div className="bg-white px-4 py-5 sm:px-6">
                              <dt className="text-sm font-medium text-gray-500 mb-3">Table Details</dt>
                              <dd className="mt-1">
                                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                  <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                          Table
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                          Records Deleted
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                          Retention (days)
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                          Duration
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {health.checks.cleanup_scheduler.lastRunSummary.tables.map((table, idx) => (
                                        <tr key={idx}>
                                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-mono">
                                            {table.table}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                            {table.recordsDeleted.toLocaleString()}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                            {table.retentionDays}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                            {formatDuration(table.executionTimeMs)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </dd>
                            </div>
                          )}
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> The database cleanup scheduler automatically prunes old quiz attempts and
                      watch sessions according to configured retention policies. The latest quiz attempt per user is
                      always preserved. This page auto-refreshes every 30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
