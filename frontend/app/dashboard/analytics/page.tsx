'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  FolderOpen,
  HelpCircle,
  Coins,
  ShieldAlert,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { selectedApp } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch charts data (which includes token trends)
  const {
    data: chartsData,
    isLoading: chartsLoading,
    refetch: refetchCharts
  } = useQuery({
    queryKey: ['analytics-charts', selectedApp?.id, timeRange],
    queryFn: async () => {
      if (!selectedApp?.id) return null;
      // We can reuse the charts endpoint which sends timeSeries data, but let's see what is inside it.
      // Wait, let's verify if our charts endpoint in the backend returns token counts.
      // Ah! In `analyticsController.ts`, we returned:
      // timeSeriesData with: date, cost, requests, avgLatency, errorRate.
      // Wait, did we return tokens in the timeseries? No, let's check!
      // In `analyticsController.ts`, we did:
      // select: { model: true, estimatedCost: true, latencyMs: true, status: true, createdAt: true }
      // Oh! We didn't query tokens. Wait! If the user wants token consumption charts, we can extend the backend or compute it.
      // Let's modify the backend analyticsController.ts to select and return promptTokens, completionTokens, totalTokens!
      // This is a great idea, and we can easily do it by modifying analyticsController.ts. Let's do that right after.
      const res = await apiClient.get(`/api/analytics/charts/${selectedApp.id}?timeRange=${timeRange}`);
      return res.data?.charts;
    },
    enabled: !!selectedApp?.id
  });

  useEffect(() => {
    if (selectedApp?.id) {
      refetchCharts();
    }
  }, [selectedApp, timeRange]);

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-900/40 border border-border rounded-xl">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Applications Configured</h3>
        <p className="text-sm text-muted-foreground mt-1">Select or configure an application to view analytics.</p>
      </div>
    );
  }

  const timeSeries = chartsData?.timeSeries || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Advanced Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep-dive metrics on cost efficiency, error rates, and tokens.</p>
        </div>

        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-border/80 self-start sm:self-center">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                timeRange === range
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {chartsLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tokens chart: Stacked Area chart showing Prompt vs Completion tokens */}
          <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Token Consumption</h3>
              <p className="text-xs text-muted-foreground">Volume of inputs (prompt) and outputs (completion) processed</p>
            </div>
            <div className="h-72">
              {timeSeries.length > 0 && timeSeries[0].promptTokens !== undefined ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="promptColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="completionColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" name="Prompt Tokens" dataKey="promptTokens" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#promptColor)" />
                    <Area type="monotone" name="Completion Tokens" dataKey="completionTokens" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#completionColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <span>Tokens breakdown chart is loading or requires data.</span>
                  <span className="text-xs text-muted-foreground/60">(If you just sent requests, they will populate here shortly)</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Rate Chart */}
          <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Error Rate Trend</h3>
              <p className="text-xs text-muted-foreground">Percentage of failed requests (non-200 responses) over time</p>
            </div>
            <div className="h-72">
              {timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                      formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Error Rate']}
                    />
                    <Line type="monotone" dataKey="errorRate" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No data recorded.
                </div>
              )}
            </div>
          </div>

          {/* Efficiency metrics card */}
          <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl lg:col-span-2">
            <h3 className="text-base font-bold text-white mb-4">Cost Efficiency Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-1">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Cost per 1K Tokens</h4>
                  <p className="text-lg font-bold mt-1 text-slate-200">
                    {timeSeries.length > 0
                      ? `$${(
                          (timeSeries.reduce((sum: number, item: any) => sum + item.cost, 0) /
                            (timeSeries.reduce((sum: number, item: any) => sum + (item.totalTokens || 0), 0) || 1)) *
                          1000
                        ).toFixed(5)}`
                      : '$0.00000'}
                  </p>
                  <span className="text-xs text-muted-foreground">Average cost index across all logs</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-1">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Latency / Cost Ratio</h4>
                  <p className="text-lg font-bold mt-1 text-slate-200">
                    {timeSeries.length > 0
                      ? `${(
                          timeSeries.reduce((sum: number, item: any) => sum + item.avgLatency, 0) /
                          (timeSeries.reduce((sum: number, item: any) => sum + item.cost, 0) || 1)
                        ).toFixed(0)} ms/$`
                      : '0 ms/$'}
                  </p>
                  <span className="text-xs text-muted-foreground">Milliseconds delivered per dollar spent</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 mt-1">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Unstable Requests</h4>
                  <p className="text-lg font-bold mt-1 text-slate-200">
                    {timeSeries.reduce((sum: number, item: any) => sum + (item.errorCount || 0), 0)}
                  </p>
                  <span className="text-xs text-muted-foreground">Total errors tracked in current scope</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
