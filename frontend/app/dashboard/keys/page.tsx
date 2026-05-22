'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  FolderOpen,
  KeyRound,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Plus
} from 'lucide-react';

export default function ApiKeysPage() {
  const { selectedApp } = useAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch API Keys
  const {
    data: apiKeys,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['api-keys', selectedApp?.id],
    queryFn: async () => {
      if (!selectedApp?.id) return [];
      const res = await apiClient.get(`/api/keys/app/${selectedApp.id}`);
      return res.data?.apiKeys || [];
    },
    enabled: !!selectedApp?.id
  });

  useEffect(() => {
    if (selectedApp?.id) {
      refetch();
    }
  }, [selectedApp]);

  const handleGenerateKey = async () => {
    if (!selectedApp?.id) return;
    setGenerating(true);
    setNewRawKey(null);

    try {
      const res = await apiClient.post('/api/keys/generate', {
        appId: selectedApp.id,
      });

      if (res.data?.success) {
        setNewRawKey(res.data.rawKey);
        refetch();
      }
    } catch (err) {
      console.error('Failed to generate API key', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action is immediate and cannot be undone.')) {
      return;
    }

    try {
      const res = await apiClient.delete(`/api/keys/${keyId}`);
      if (res.data?.success) {
        refetch();
      }
    } catch (err) {
      console.error('Failed to revoke API key', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-900/40 border border-border rounded-xl">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Applications Configured</h3>
        <p className="text-sm text-muted-foreground mt-1">Select or configure an application to view API keys.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage proxy tokens to authenticate OpenAI completions through AICostGuard.
          </p>
        </div>

        <button
          onClick={handleGenerateKey}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white rounded-md transition-colors shadow-lg shadow-indigo-600/15"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Generate API Key
        </button>
      </div>

      {/* Raw key display alert after generation */}
      {newRawKey && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-start gap-3 text-amber-400">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Copy your API Key now</h3>
              <p className="text-xs text-muted-foreground mt-1">
                For security reasons, you cannot view this key again after closing this panel. Store it in a password manager.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 border border-input rounded-md p-3">
            <code className="text-xs font-mono text-amber-200 select-all truncate flex-1">{newRawKey}</code>
            <button
              onClick={() => copyToClipboard(newRawKey)}
              className="p-1.5 hover:bg-slate-800 text-muted-foreground hover:text-white rounded border border-border transition-colors"
              title="Copy to clipboard"
            >
              {copiedKey === newRawKey ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            onClick={() => setNewRawKey(null)}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded transition-colors text-white"
          >
            I have saved the key
          </button>
        </div>
      )}

      {/* API Key list */}
      <div className="bg-slate-900/60 border border-border/80 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40">
          <h3 className="text-sm font-bold text-white">Active Keys</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <KeyRound className="h-8 w-8 text-muted-foreground/60" />
            <span>No active API keys created yet. Generate one above.</span>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {apiKeys.map((key: any) => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <code className="text-sm font-mono text-white">{key.keyPrefix}</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created on {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="p-1.5 hover:bg-rose-950/20 text-muted-foreground hover:text-rose-400 border border-transparent hover:border-rose-500/20 rounded transition-all"
                    title="Revoke Key"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Guide */}
      <div className="bg-slate-900/60 border border-border/80 rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">How to connect your Client App</h3>
        <p className="text-sm text-muted-foreground">
          Replace your standard OpenAI endpoint with AICostGuard. AICostGuard accepts the same request body formats.
        </p>

        <div className="bg-slate-950 border border-border rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto space-y-3">
          <div>
            <span className="text-muted-foreground">// Example using Node.js OpenAI SDK</span>
          </div>
          <div>
            <span className="text-indigo-400">import</span> OpenAI <span className="text-indigo-400">from</span> <span className="text-emerald-400">&apos;openai&apos;</span>;
          </div>
          <div className="mt-2">
            <span className="text-indigo-400">const</span> openai = <span className="text-indigo-400">new</span> <span className="text-purple-400">OpenAI</span>(&#123;
            <div className="pl-4">
              apiKey: <span className="text-emerald-400">&apos;YOUR_AICoSTGUARD_API_KEY&apos;</span>, <span className="text-muted-foreground">// generated above</span>
            </div>
            <div className="pl-4">
              baseURL: <span className="text-emerald-400">&apos;{typeof window !== 'undefined' ? `${window.location.origin}/api/proxy` : 'http://localhost:4000/api/proxy'}&apos;</span>,
            </div>
            <div className="pl-4">
              defaultHeaders: &#123;
              <div className="pl-4">
                <span className="text-emerald-400">&apos;X-OpenAI-API-Key&apos;</span>: <span className="text-emerald-400">&apos;YOUR_OPENAI_API_KEY&apos;</span> <span className="text-muted-foreground">// optional if set in backend env</span>
              </div>
              &#125;
            </div>
            &#125;);
          </div>
        </div>
      </div>
    </div>
  );
}
