'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Activity,
  AlertOctagon,
  Loader2,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function OverviewPage() {
  const { selectedApp } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch overview stats
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['overview-stats', selectedApp?.id, timeRange],
    queryFn: async () => {
      if (!selectedApp?.id) return null;
      const res = await apiClient.get(`/api/analytics/overview/${selectedApp.id}?timeRange=${timeRange}`);
      return res.data?.stats;
    },
    enabled: !!selectedApp?.id
  });

  // Fetch charts data
  const {
    data: chartsData,
    isLoading: chartsLoading,
    refetch: refetchCharts
  } = useQuery({
    queryKey: ['overview-charts', selectedApp?.id, timeRange],
    queryFn: async () => {
      if (!selectedApp?.id) return null;
      const res = await apiClient.get(`/api/analytics/charts/${selectedApp.id}?timeRange=${timeRange}`);
      return res.data?.charts;
    },
    enabled: !!selectedApp?.id
  });

  // Refetch when selectedApp changes
  useEffect(() => {
    if (selectedApp?.id) {
      refetchStats();
      refetchCharts();
    }
  }, [selectedApp, timeRange]);

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-900/40 border border-border rounded-xl">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Applications Configured</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          To begin tracking metrics, set up a new application.
        </p>
        <Link href="/dashboard/settings" className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-semibold transition-colors">
          Configure Apps
        </Link>
      </div>
    );
  }

  const isDataLoading = statsLoading || chartsLoading;
  const timeSeries = chartsData?.timeSeries || [];
  const modelUsage = chartsData?.modelUsage || [];

  const statCards = [
    {
      name: 'Total Requests',
      value: statsData ? statsData.totalRequests.toLocaleString() : '0',
      icon: Activity,
      color: 'text-blue-400 bg-blue-500/10'
    },
    {
      name: 'Total Spend',
      value: statsData ? `$${statsData.totalCost.toFixed(5)}` : '$0.00000',
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10'
    },
    {
      name: 'Average Latency',
      value: statsData ? `${statsData.avgLatency}ms` : '0ms',
      icon: TrendingUp,
      color: 'text-purple-400 bg-purple-500/10'
    },
    {
      name: 'Error Rate',
      value: statsData ? `${(statsData.errorRate * 100).toFixed(1)}%` : '0.0%',
      icon: AlertOctagon,
      color: 'text-rose-400 bg-rose-500/10'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{selectedApp.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics, costs and log analytics.</p>
        </div>

        {/* Time range selector pills */}
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

      {isDataLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Card Statistics Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.name}
                  className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-800 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground truncate">{card.name}</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${card.color} transition-all duration-300 group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Cost & Requests Over Time Chart */}
            <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Daily Cost & Requests</h3>
                <p className="text-xs text-muted-foreground">Historical cost and usage patterns</p>
              </div>
              <div className="h-80">
                {timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="costColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                      <Area type="monotone" name="Cost ($)" dataKey="cost" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#costColor)" />
                      <Area type="monotone" name="Requests" dataKey="requests" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No data recorded for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Model Usage Distribution */}
            <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl flex flex-col space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Model Distribution</h3>
                <p className="text-xs text-muted-foreground">Percentage of requests by model</p>
              </div>
              <div className="h-60 relative flex-1">
                {modelUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {modelUsage.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No model usage logged.
                  </div>
                )}
              </div>
              {modelUsage.length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {modelUsage.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="font-semibold text-white">({entry.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Latency Trend bar chart */}
            <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl lg:col-span-3 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Latency Trends</h3>
                <p className="text-xs text-muted-foreground">Average response times over the selected period</p>
              </div>
              <div className="h-64">
                {timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                      />
                      <Bar name="Avg Latency (ms)" dataKey="avgLatency" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No latency data recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions / Getting Started */}
          {timeSeries.length === 0 && (
            <div className="bg-gradient-to-r from-indigo-900/20 via-purple-900/20 to-pink-900/20 border border-indigo-500/20 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white">Getting Started</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your application is active but has not processed any API requests. Integrate the proxy endpoint with your codebase to begin logging telemetry.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/dashboard/keys"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Generate an API Key <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
