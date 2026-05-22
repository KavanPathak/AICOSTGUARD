'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import {
  Loader2,
  Settings,
  Plus,
  Trash2,
  Save,
  Sliders,
  FolderPlus,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  const { selectedApp, selectApp, refreshApps, apps } = useAuth();
  
  // App Edit Fields
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCostLimit, setEditCostLimit] = useState(5.0);
  const [editLatency, setEditLatency] = useState(3000);
  const [editErrorRate, setEditErrorRate] = useState(15);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // New App Creation Fields
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCostLimit, setNewCostLimit] = useState(5.0);
  const [newLatency, setNewLatency] = useState(3000);
  const [newErrorRate, setNewErrorRate] = useState(15);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Prefill fields when selectedApp changes
  useEffect(() => {
    const fetchAppDetails = async () => {
      if (!selectedApp?.id) return;
      try {
        const res = await apiClient.get(`/api/apps/${selectedApp.id}`);
        if (res.data?.success) {
          const app = res.data.app;
          setEditName(app.name);
          setEditDesc(app.description || '');
          setEditCostLimit(app.dailyCostLimit);
          setEditLatency(app.latencyThreshold);
          setEditErrorRate(Math.round(app.errorRateThreshold * 100));
        }
      } catch (err) {
        console.error('Failed to load app settings', err);
      }
    };
    fetchAppDetails();
    setUpdateSuccess(false);
  }, [selectedApp]);

  const handleUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp?.id) return;
    setUpdating(true);
    setUpdateSuccess(false);

    try {
      const res = await apiClient.put(`/api/apps/${selectedApp.id}`, {
        name: editName,
        description: editDesc,
        dailyCostLimit: Number(editCostLimit),
        latencyThreshold: Number(editLatency),
        errorRateThreshold: Number(editErrorRate) / 100, // convert percentage back to decimal
      });

      if (res.data?.success) {
        setUpdateSuccess(true);
        await refreshApps();
        // Update local name reference
        selectApp({ id: selectedApp.id, name: editName });
      }
    } catch (err) {
      console.error('Failed to update app thresholds', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await apiClient.post('/api/apps', {
        name: newName,
        description: newDesc,
        dailyCostLimit: Number(newCostLimit),
        latencyThreshold: Number(newLatency),
        errorRateThreshold: Number(newErrorRate) / 100,
      });

      if (res.data?.success) {
        const newApp = res.data.app;
        setNewName('');
        setNewDesc('');
        setNewCostLimit(5.0);
        setNewLatency(3000);
        setNewErrorRate(15);
        
        await refreshApps();
        selectApp({ id: newApp.id, name: newApp.name });
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create application');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedApp?.id) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete "${selectedApp.name}"? This will delete all associated API keys, request logs, and alerts. This action is irreversible.`
      )
    ) {
      return;
    }

    try {
      const res = await apiClient.delete(`/api/apps/${selectedApp.id}`);
      if (res.data?.success) {
        await refreshApps();
        // The auth context will automatically select another app if available
      }
    } catch (err) {
      console.error('Failed to delete app', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure applications, limits and thresholds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* App Configuration & Thresholds */}
        <div className="lg:col-span-2 space-y-6">
          {selectedApp ? (
            <div className="bg-slate-900/60 border border-border/80 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">App Configurations & Thresholds</h3>
              </div>

              <form onSubmit={handleUpdateApp} className="p-6 space-y-6">
                {updateSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md">
                    Configurations updated successfully.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Application Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="App description..."
                      className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-border/60 my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                      Daily Cost Limit ($)
                      <span title="Max dollars allowed to spend per day before alerts are fired" className="text-muted-foreground/60 cursor-help">
                        <Info className="h-3 w-3" />
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editCostLimit}
                      onChange={(e) => setEditCostLimit(parseFloat(e.target.value))}
                      className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                      Latency Limit (ms)
                      <span title="Alert will trigger if any completion takes longer than this value" className="text-muted-foreground/60 cursor-help">
                        <Info className="h-3 w-3" />
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editLatency}
                      onChange={(e) => setEditLatency(parseInt(e.target.value))}
                      className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                      Error Rate Alert (%)
                      <span title="Alert triggers if non-2xx rate exceeds this threshold over last 50 requests" className="text-muted-foreground/60 cursor-help">
                        <Info className="h-3 w-3" />
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={editErrorRate}
                      onChange={(e) => setEditErrorRate(parseInt(e.target.value))}
                      className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold rounded-md transition-colors text-white"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Configurations
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteApp}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 text-xs font-semibold rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete App
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-border/80 rounded-xl p-8 text-center text-muted-foreground">
              Select or create an application to view settings.
            </div>
          )}
        </div>

        {/* Create Application */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-border/80 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Create New App</h3>
            </div>

            <form onSubmit={handleCreateApp} className="p-6 space-y-4">
              {createError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-md">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">App Name</label>
                <input
                  type="text"
                  required
                  placeholder="Production API Proxy"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  placeholder="App description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Daily Cost Limit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newCostLimit}
                  onChange={(e) => setNewCostLimit(parseFloat(e.target.value))}
                  className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Latency Limit (ms)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newLatency}
                    onChange={(e) => setNewLatency(parseInt(e.target.value))}
                    className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Error Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newErrorRate}
                    onChange={(e) => setNewErrorRate(parseInt(e.target.value))}
                    className="w-full bg-slate-950/60 border border-input rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold rounded-md transition-colors text-white mt-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Application
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
