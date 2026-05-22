'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  FolderOpen,
  BellRing,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  BellOff
} from 'lucide-react';

export default function AlertsPage() {
  const { selectedApp } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const {
    data: alerts,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['alerts', selectedApp?.id, filter],
    queryFn: async () => {
      if (!selectedApp?.id) return [];
      let url = `/api/alerts/app/${selectedApp.id}`;
      if (filter === 'resolved') {
        url += '?isResolved=true';
      } else if (filter === 'unresolved') {
        url += '?isResolved=false';
      }
      const res = await apiClient.get(url);
      return res.data?.alerts || [];
    },
    enabled: !!selectedApp?.id
  });

  useEffect(() => {
    if (selectedApp?.id) {
      refetch();
    }
  }, [selectedApp, filter]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await apiClient.put(`/api/alerts/resolve/${alertId}`);
      if (res.data?.success) {
        refetch();
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-900/40 border border-border rounded-xl">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Applications Configured</h3>
        <p className="text-sm text-muted-foreground mt-1">Select or configure an application to view alerts.</p>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'cost_limit':
        return <DollarSign className="h-5 w-5 text-emerald-400" />;
      case 'latency_threshold':
        return <Clock className="h-5 w-5 text-purple-400" />;
      case 'error_rate':
      default:
        return <AlertTriangle className="h-5 w-5 text-rose-400" />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'cost_limit':
        return 'Daily Cost Exceeded';
      case 'latency_threshold':
        return 'Latency Threshold Breached';
      case 'error_rate':
        return 'High Error Rate Detected';
      default:
        return 'Anomaly Detected';
    }
  };

  const getAlertColor = (isResolved: boolean) => {
    return isResolved
      ? 'border-emerald-500/20 bg-emerald-950/5'
      : 'border-rose-500/20 bg-rose-950/5';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">System Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time threshold monitoring across cost, latency and routing error rates.
          </p>
        </div>

        {/* Filters */}
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-border/80 self-start sm:self-center">
          {(['unresolved', 'resolved', 'all'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                filter === opt
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts feed */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-2 bg-slate-900/40 border border-border rounded-xl">
          <BellOff className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h3 className="font-semibold text-white">All Clear!</h3>
          <p className="max-w-xs text-xs text-muted-foreground/80">No alerts are currently flagged in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.005] duration-200 ${getAlertColor(
                alert.isResolved
              )}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg bg-slate-950/60 border border-border`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{getAlertTitle(alert.type)}</h3>
                    {alert.isResolved ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Triggered on {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {!alert.isResolved && (
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 border border-input hover:bg-slate-800 rounded-md transition-colors text-white self-end sm:self-center"
                >
                  Resolve Alert
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
