import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import {
  Bot,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  KeyRound,
  X,
  Loader2,
  Terminal,
  Cpu,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetMcpTokenStatusQuery,
  useGenerateMcpTokenMutation,
  useRevokeMcpTokenMutation,
} from '../../auth/api/authApi';

export const McpTokensPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: mcpData, isLoading: isLoadingMcp, refetch: refetchMcp } = useGetMcpTokenStatusQuery();
  const [generateMcpToken, { isLoading: isGeneratingMcp }] = useGenerateMcpTokenMutation();
  const [revokeMcpToken, { isLoading: isRevokingMcp }] = useRevokeMcpTokenMutation();

  const [newlyGeneratedSecret, setNewlyGeneratedSecret] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isConfirmRevokeOpen, setIsConfirmRevokeOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [tokenPurpose, setTokenPurpose] = useState('Claude Desktop & AI Coding');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'claude' | 'cursor' | 'oauth' | 'curl'>('oauth');

  const mcpServerUrl = `${window.location.protocol}//${window.location.hostname}:4000/mcp`;
  const clientId = user?.mobile || '';
  const currentToken = newlyGeneratedSecret || mcpData?.data?.fullToken || mcpData?.data?.tokenPreview || '';
  const hasActiveToken = mcpData?.data?.hasToken && !mcpData?.data?.isRevoked;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateToken = async () => {
    setFeedback(null);
    try {
      const res = await generateMcpToken().unwrap();
      setNewlyGeneratedSecret(res.data.clientSecret);
      setShowSecret(true);
      setIsGenerateModalOpen(false);
      setFeedback({
        type: 'success',
        message: 'Personal Access Token generated successfully! Copy your Client Secret now.',
      });
      refetchMcp();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || err?.message || 'Failed to generate MCP token. Please check backend connection.',
      });
    }
  };

  const handleRevokeToken = async () => {
    setFeedback(null);
    try {
      await revokeMcpToken().unwrap();
      setNewlyGeneratedSecret(null);
      setIsConfirmRevokeOpen(false);
      setFeedback({
        type: 'success',
        message: 'MCP access token has been revoked immediately.',
      });
      refetchMcp();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to revoke token.',
      });
    }
  };

  // Formatted date
  const createdDateFormatted = mcpData?.data?.createdAt
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(mcpData.data.createdAt))
    : 'Recently';

  const lastUsedFormatted = mcpData?.data?.lastUsedAt
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(mcpData.data.lastUsedAt))
    : 'Never used yet';

  // Config Snippets
  const claudeConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        'momzz-garage': {
          url: mcpServerUrl,
          headers: {
            Authorization: `Bearer ${currentToken || 'YOUR_CLIENT_SECRET'}`,
            'X-Client-Id': clientId,
          },
        },
      },
    },
    null,
    2
  );

  const curlTestSnippet = `curl -X POST ${mcpServerUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${currentToken || 'YOUR_CLIENT_SECRET'}" \\
  -H "X-Client-Id: ${clientId}" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'`;

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4 max-w-5xl mx-auto w-full">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            backTo="/profile"
            title="MCP & API Tokens"
            description="Manage authentication credentials for LLMs and AI agent integrations"
          />
        </div>

        {/* Global Alert / Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 shadow-md ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Grid: Left Token Details, Right Setup Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ── LEFT COLUMN: Primary Token Management ── */}
          <div className="lg:col-span-7 space-y-4">
            <section className="rounded-3xl glass-modern-card shadow-xl p-5 space-y-5 border border-amber-400/25 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Personal Access Token (PAT)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Scoped for Model Context Protocol access
                    </p>
                  </div>
                </div>

                {/* Status Pill */}
                {hasActiveToken ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active & Ready
                  </span>
                ) : mcpData?.data?.isRevoked ? (
                  <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold border border-rose-500/30">
                    Revoked
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold border border-amber-400/30">
                    Not Configured
                  </span>
                )}
              </div>

              {/* Credential Inputs with 1-Click Copy */}
              <div className="space-y-4">
                {/* 1. MCP Server URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      MCP Server URL
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      Streamable HTTP Endpoint
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 select-all truncate">
                      {mcpServerUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mcpServerUrl, 'url')}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                    >
                      {copiedField === 'url' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Client ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Client ID (OAuth Client ID)
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                      Same as your login mobile number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all truncate">
                      {clientId || 'No Mobile Registered'}
                    </div>
                    <button
                      type="button"
                      disabled={!clientId}
                      onClick={() => copyToClipboard(clientId, 'clientId')}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {copiedField === 'clientId' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. Client Secret */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Client Secret (OAuth Client Secret)
                    </label>
                    {hasActiveToken && (
                      <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Hashed in DB
                      </span>
                    )}
                  </div>
                  {hasActiveToken || newlyGeneratedSecret ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 select-all truncate flex items-center justify-between">
                        <span className="truncate mr-2">
                          {showSecret
                            ? currentToken
                            : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
                          title={showSecret ? 'Hide secret' : 'Reveal secret'}
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentToken, 'clientSecret')}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                      >
                        {copiedField === 'clientSecret' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No active Client Secret found.
                      </p>
                      <p className="text-[11px]">
                        Click "Generate New Token" below to issue your credentials.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Token Metadata Details */}
              {hasActiveToken && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.06] grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Created On
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {createdDateFormatted}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> Last Activity
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {lastUsedFormatted}
                    </p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                {hasActiveToken ? (
                  <>
                    <button
                      type="button"
                      disabled={isGeneratingMcp}
                      onClick={() => setIsGenerateModalOpen(true)}
                      className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      {isGeneratingMcp ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Regenerate Token</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRevokingMcp}
                      onClick={() => setIsConfirmRevokeOpen(true)}
                      className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-2 active:scale-95 transition cursor-pointer"
                    >
                      {isRevokingMcp ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      <span>Revoke Token</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isGeneratingMcp}
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="w-full py-3 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition cursor-pointer"
                  >
                    {isGeneratingMcp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate MCP Token & Client Secret</span>
                  </button>
                )}
              </div>
            </section>

            {/* Security Guarantee Note */}
            <section className="rounded-3xl glass-modern-card p-4 sm:p-5 shadow-lg space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Security & Anti-Confused Deputy Architecture</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Momzz MCP server enforces zero token passthrough. When your AI client authenticates with your Client ID and Client Secret, the MCP server contacts Momzz API to verify your credentials. If valid, the Momzz API issues a scoped session Bearer token used for upstream requests, preventing token leakage and hallucinated privilege abuse.
              </p>
            </section>
          </div>

          {/* ── RIGHT COLUMN: Client Connection Guides ── */}
          <div className="lg:col-span-5 space-y-4">
            <section className="rounded-3xl glass-modern-card shadow-xl p-5 space-y-4 border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Client Integration Guides
                </h4>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
                <button
                  onClick={() => setActiveGuideTab('oauth')}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    activeGuideTab === 'oauth'
                      ? 'bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  OAuth UI
                </button>
                <button
                  onClick={() => setActiveGuideTab('claude')}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    activeGuideTab === 'claude'
                      ? 'bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Claude
                </button>
                <button
                  onClick={() => setActiveGuideTab('cursor')}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    activeGuideTab === 'cursor'
                      ? 'bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Cursor
                </button>
                <button
                  onClick={() => setActiveGuideTab('curl')}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    activeGuideTab === 'curl'
                      ? 'bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  cURL
                </button>
              </div>

              {/* Tab 1: OAuth Modal Guide (matching user's screenshot!) */}
              {activeGuideTab === 'oauth' && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-amber-600 dark:text-amber-400 text-xs mb-1">
                      Connect to an MCP Server dialog:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-mono">
                      <li>
                        <strong>MCP server URL:</strong> Paste the URL from the left ({mcpServerUrl})
                      </li>
                      <li>
                        <strong>Client ID:</strong> Paste your mobile number ({clientId})
                      </li>
                      <li>
                        <strong>Client secret:</strong> Paste your generated Client Secret
                      </li>
                    </ol>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    The client will authenticate directly using OAuth 2.0 Client Credentials or transport Bearer injection.
                  </p>
                </div>
              )}

              {/* Tab 2: Claude Desktop */}
              {activeGuideTab === 'claude' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add this server to your <code>claude_desktop_config.json</code>:
                  </p>
                  <div className="relative group">
                    <pre className="p-3.5 rounded-2xl bg-slate-900 text-amber-300 text-[11px] font-mono overflow-x-auto leading-relaxed">
                      {claudeConfigSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(claudeConfigSnippet, 'claudeConfig')}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title="Copy JSON configuration"
                    >
                      {copiedField === 'claudeConfig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Cursor / VS Code */}
              {activeGuideTab === 'cursor' && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    In Cursor Settings &gt; Features &gt; MCP &gt; Add New MCP Server:
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400">Type:</span> <strong>sse / streamableHttp</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">URL:</span> <strong>{mcpServerUrl}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Authorization:</span> <strong>Bearer {currentToken ? 'momzz_pat_...' : 'TOKEN'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: cURL */}
              {activeGuideTab === 'curl' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Run in your terminal to verify tools list:
                  </p>
                  <div className="relative group">
                    <pre className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 text-[10px] font-mono overflow-x-auto leading-relaxed">
                      {curlTestSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(curlTestSnippet, 'curlSnippet')}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title="Copy cURL command"
                    >
                      {copiedField === 'curlSnippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Generate / Regenerate Modal */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0f0f1e] border border-slate-200 dark:border-white/12 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Issue Personal Access Token
                </h3>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                This token allows external MCP clients (Claude, Cursor) to act on behalf of your user account (<strong>{user?.name}</strong>).
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Token Purpose / Label
                  </label>
                  <input
                    type="text"
                    value={tokenPurpose}
                    onChange={(e) => setTokenPurpose(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-400"
                    placeholder="e.g. Claude Desktop Agent"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>Notice:</strong> If you already have an existing token, generating a new one will replace your active Client Secret.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isGeneratingMcp}
                  onClick={handleCreateToken}
                  className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-400/25 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingMcp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Generate Token</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revoke Confirmation Modal */}
      <AnimatePresence>
        {isConfirmRevokeOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#0f0f1e] border border-slate-200 dark:border-white/12 shadow-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" /> Revoke MCP Access
                </h3>
                <button
                  onClick={() => setIsConfirmRevokeOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to revoke this MCP token? Any AI client (Claude Desktop, Cursor, etc.) currently using this Client Secret will immediately lose access.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmRevokeOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRevokingMcp}
                  onClick={handleRevokeToken}
                  className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isRevokingMcp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Yes, Revoke</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default McpTokensPage;
