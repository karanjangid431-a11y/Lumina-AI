import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReasoningConsole from '../components/ReasoningConsole.js';
import { VisualCitationModal, BoundingBoxCitation } from '../components/VisualCitationModal.js';
import {
  Send, Bot, User, BookOpen, Zap, Loader, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Cpu, Search, CheckCircle, Terminal, Eye
} from 'lucide-react';

interface Citation {
  sourceTitle: string;
  authors?: string[];
  year?: number;
  quote: string;
  page?: number;
  similarity?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent_step';
  content: string;
  citations?: Citation[];
  retrievalTrace?: any;
  confidence?: number;
  mode?: string;
}

export default function QAPage() {
  const { wid } = useParams<{ wid: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentMode, setAgentMode] = useState(false);
  const [showTrace, setShowTrace] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<BoundingBoxCitation | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, 'up' | 'down'>>({});
  const [reasoningMode, setReasoningMode] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sourcesData } = useQuery({
    queryKey: ['sources', wid],
    queryFn: () => api.getSources(wid!),
    enabled: !!wid,
  });
  const sources = (sourcesData as any)?.sources || [];

  const askMut = useMutation({
    mutationFn: (query: string) =>
      agentMode ? api.runAgent(wid!, query) : api.askQuestion(wid!, { query }),
    onSuccess: (res: any) => {
      const msg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: res.answer || res.finalAnswer || JSON.stringify(res),
        citations: res.citations || [],
        retrievalTrace: res.retrievalTrace || res.trace,
        confidence: res.confidence,
        mode: agentMode ? 'agent' : 'standard',
      };
      setMessages((prev) => [...prev, msg]);
    },
    onError: (err: any) => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
        citations: [],
      }]);
    },
  });

  const feedbackMut = useMutation({
    mutationFn: ({ msgId, rating }: { msgId: string; rating: 'up' | 'down' }) =>
      api.sendFeedback(wid!, { target_type: 'qa_answer', target_id: msgId, rating }),
    onSuccess: (_, variables) => {
      setFeedbackRatings((prev) => ({ ...prev, [variables.msgId]: variables.rating }));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askMut.isPending]);

  const handleSend = () => {
    if (!input.trim() || askMut.isPending) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    const q = input.trim();
    setInput('');

    if (reasoningMode && !agentMode) {
      // Use SSE stream — ReasoningConsole will call handleReasoningAnswer when done
      setStreamUrl(api.getReasoningStreamUrl(wid!, q));
    } else {
      askMut.mutate(q);
    }
  };

  const handleReasoningAnswer = useCallback((result: any) => {
    const msg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.answer || result.finalAnswer || JSON.stringify(result),
      citations: result.citations || [],
      retrievalTrace: result.retrievalTrace || result.trace,
      confidence: result.confidence,
      mode: 'standard',
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const confidenceColor = (c?: number) => {
    if (!c) return 'text-slate-500';
    if (c >= 0.8) return 'text-emerald-400';
    if (c >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Ask AI</h2>
          <p className="text-slate-400 text-sm mt-0.5">Grounded Q&A with citations from your workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{sources.length} sources loaded</span>
          {/* Reasoning Console toggle */}
          <button
            onClick={() => setReasoningMode(!reasoningMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              reasoningMode
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            {reasoningMode ? 'Reasoning ON' : 'Reasoning'}
          </button>
          <button
            onClick={() => setAgentMode(!agentMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              agentMode
                ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {agentMode ? 'Agent Mode ON' : 'Agent Mode'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ask anything about your documents</h3>
            <p className="text-slate-500 text-sm max-w-md mb-6">
              Every answer is grounded in your sources with inline citations. I'll never hallucinate.
            </p>
            {sources.length === 0 ? (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                ⚠️ No sources loaded. Go to Library and add some documents first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  'What are the main findings across all papers?',
                  'What methodology did the authors use?',
                  'What research gaps are identified?',
                  'Summarize the key contributions',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-left text-xs p-3 glass-card rounded-xl text-slate-300 hover:text-white border border-slate-700/30 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-2xl ${msg.role === 'user' ? 'order-first' : ''}`}>
              {msg.role === 'user' ? (
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-blue-100">
                  {msg.content}
                </div>
              ) : (
                <div className="glass-panel rounded-2xl rounded-tl-sm p-4">
                  {/* Mode badge */}
                  {msg.mode === 'agent' && (
                    <div className="flex items-center gap-1.5 text-xs text-violet-300 mb-2">
                      <Cpu className="w-3 h-3" /> Agent research result
                    </div>
                  )}

                  {/* Answer */}
                  <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Confidence */}
                  {msg.confidence !== undefined && (
                    <div className={`text-xs mt-2 ${confidenceColor(msg.confidence)}`}>
                      Confidence: {Math.round((msg.confidence || 0) * 100)}%
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 border-t border-slate-700/40 pt-3">
                      <button
                        onClick={() => setShowCitations(showCitations === msg.id ? null : msg.id)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-300 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {msg.citations.length} citation{msg.citations.length !== 1 ? 's' : ''}
                        {showCitations === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showCitations === msg.id && (
                        <div className="mt-2 space-y-2">
                          {msg.citations.map((c, i) => (
                            <div key={i} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/30">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs font-medium text-blue-300">[{i + 1}] {c.sourceTitle}</div>
                                  {c.authors && <div className="text-xs text-slate-500">{c.authors.slice(0, 2).join(', ')}{c.year ? `, ${c.year}` : ''}</div>}
                                  {c.page && <div className="text-xs text-slate-500">p.{c.page}</div>}
                                </div>
                                {c.similarity && (
                                  <span className="text-xs text-emerald-400 shrink-0">
                                    {Math.round(c.similarity * 100)}% match
                                  </span>
                                )}
                              </div>
                              <blockquote className="mt-2 text-xs text-slate-400 italic border-l-2 border-blue-500/40 pl-2 leading-relaxed">
                                "{c.quote}"
                              </blockquote>
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => setSelectedCitation(c)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[11px] font-medium border border-blue-500/20 transition-all"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Visual Evidence Box
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Retrieval trace */}
                  {msg.retrievalTrace && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowTrace(showTrace === msg.id ? null : msg.id)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Search className="w-3 h-3" />
                        Retrieval trace
                        {showTrace === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showTrace === msg.id && (
                        <div className="mt-2 bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-x-auto border border-slate-700/30">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(msg.retrievalTrace, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/30">
                    <span className="text-xs text-slate-600">Was this helpful?</span>
                    <button
                      onClick={() => feedbackMut.mutate({ msgId: msg.id, rating: 'up' })}
                      className={`p-1 rounded transition-colors ${
                        feedbackRatings[msg.id] === 'up'
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'
                      }`}
                      title="Helpful grounded response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => feedbackMut.mutate({ msgId: msg.id, rating: 'down' })}
                      className={`p-1 rounded transition-colors ${
                        feedbackRatings[msg.id] === 'down'
                          ? 'bg-red-500/20 text-red-400 font-semibold'
                          : 'hover:bg-red-500/10 text-slate-500 hover:text-red-400'
                      }`}
                      title="Unhelpful response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    {feedbackRatings[msg.id] && (
                      <span className="text-[11px] text-slate-500 ml-1">Feedback saved</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {askMut.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass-panel rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3">
              <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">
                {agentMode ? 'Research agent thinking...' : 'Searching sources & generating answer...'}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 space-y-3">
        {/* Reasoning Console */}
        {reasoningMode && (
          <ReasoningConsole
            streamUrl={streamUrl}
            onAnswer={handleReasoningAnswer}
            onDone={() => setStreamUrl('')}
          />
        )}
        <div className="glass-panel rounded-2xl p-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={agentMode ? 'Research query for agent mode...' : 'Ask a question about your documents...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none px-3 py-2.5 max-h-32"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || askMut.isPending}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          {agentMode ? '🤖 Agent mode: multi-step reasoning with tool use' : '⚡ Grounded answers · No hallucinations · Citations included'}
        </p>
      </div>

      {/* Spatial Document Citation Bounding Box Modal */}
      {selectedCitation && (
        <VisualCitationModal
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
