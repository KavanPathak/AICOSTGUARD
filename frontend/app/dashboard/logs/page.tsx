'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  FolderOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Coins
} from 'lucide-react';

export default function LogsPage() {
  const { selectedApp } = useAuth();
  const [page, setPage] = useState(1);
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when app, model, or status change
  useEffect(() => {
    setPage(1);
  }, [selectedApp, model, status]);

  const {
    data: logsResponse,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['request-logs', selectedApp?.id, page, model, status, debouncedSearch],
    queryFn: async () => {
      if (!selectedApp?.id) return null;
      const res = await apiClient.get(
        `/api/analytics/logs/${selectedApp.id}?page=${page}&limit=10&model=${model}&status=${status}&search=${debouncedSearch}`
      );
      return res.data;
    },
    enabled: !!selectedApp?.id
  });

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-900/40 border border-border rounded-xl">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Applications Configured</h3>
        <p className="text-sm text-muted-foreground mt-1">Select or configure an application to view request logs.</p>
      </div>
    );
  }

  const logs = logsResponse?.logs || [];
  const pagination = logsResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Request Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit trail of all completions routed through your API keys.</p>
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900/60 border border-border/80 rounded-xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs or errors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/60 border border-input rounded-md focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Model selection */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Models</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o-Mini</option>
          </select>

          {/* Status selection */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="success">Success (2xx)</option>
            <option value="error">Error (non-2xx)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-border/80 rounded-xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No request logs found matching the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground uppercase bg-slate-900/40">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Latency</th>
                  <th className="px-6 py-3">Tokens</th>
                  <th className="px-6 py-3">Est. Cost</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {logs.map((log: any) => {
                  const isSuccess = log.status >= 200 && log.status < 300;
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-slate-800/20 transition-colors ${isExpanded ? 'bg-slate-800/10' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                          {log.model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> {log.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="h-3 w-3" /> {log.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-purple-400" /> {log.latencyMs}ms
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {log.totalTokens.toLocaleString()} <span className="text-xs text-muted-foreground/60">({log.promptTokens}/{log.completionTokens})</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-200">
                          <span className="flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5 text-emerald-400" /> ${log.estimatedCost.toFixed(5)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-slate-950/40 border-t border-b border-border/80">
                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="font-semibold text-muted-foreground">Log ID:</span>{' '}
                                <code className="text-indigo-300">{log.id}</code>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground">Provider:</span>{' '}
                                <span className="text-slate-300 capitalize">{log.provider}</span>
                              </div>
                              {!isSuccess && log.errorMessage && (
                                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-300 font-mono overflow-auto max-h-40">
                                  <div className="font-semibold mb-1">OpenAI Error Response:</div>
                                  {log.errorMessage}
                                </div>
                              )}
                              {isSuccess && (
                                <div className="text-muted-foreground">
                                  Token distribution: <code className="text-slate-300">{log.promptTokens}</code> prompt tokens,{' '}
                                  <code className="text-slate-300">{log.completionTokens}</code> completion tokens. Cost calculated at{' '}
                                  {log.model.includes('mini') ? 'gpt-4o-mini' : 'gpt-4o'} pricing rates.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!isLoading && logs.length > 0 && (
          <div className="px-6 py-4 border-t border-border/80 flex items-center justify-between bg-slate-900/40">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-white">{logs.length}</span> logs (Total:{' '}
              <span className="font-semibold text-white">{pagination.total}</span>)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 border border-input rounded hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                Page <span className="font-semibold text-white">{page}</span> of{' '}
                <span className="font-semibold text-white">{pagination.totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="p-1.5 border border-input rounded hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
