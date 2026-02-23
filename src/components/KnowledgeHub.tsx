'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Lightbulb,
  ChevronLeft,
  Clock,
  X,
  Search,
  Bookmark,
  BookmarkCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  knowledgeArticles,
  categoryInfo,
  getFeaturedArticle,
} from '@/lib/knowledge';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import type { ContentCategory, KnowledgeArticle } from '@/lib/types';

// ── Category gradient map — gives each topic a visual identity ───────────
const CAT_STYLE: Record<string, { gradient: string; accent: string; bg: string }> = {
  muscle_science:    { gradient: 'from-blue-500/20 to-cyan-500/10',    accent: 'text-blue-400',    bg: 'bg-blue-500/10' },
  lifting_technique: { gradient: 'from-amber-500/20 to-orange-500/10', accent: 'text-amber-400',   bg: 'bg-amber-500/10' },
  periodization:     { gradient: 'from-violet-500/20 to-purple-500/10',accent: 'text-violet-400',  bg: 'bg-violet-500/10' },
  recovery:          { gradient: 'from-green-500/20 to-emerald-500/10',accent: 'text-green-400',   bg: 'bg-green-500/10' },
  nutrition:         { gradient: 'from-red-500/20 to-rose-500/10',     accent: 'text-red-400',     bg: 'bg-red-500/10' },
  dieting:           { gradient: 'from-yellow-500/20 to-amber-500/10', accent: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  grappling:         { gradient: 'from-indigo-500/20 to-blue-500/10',  accent: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  motivation:        { gradient: 'from-pink-500/20 to-rose-500/10',    accent: 'text-pink-400',    bg: 'bg-pink-500/10' },
  striking:          { gradient: 'from-orange-500/20 to-red-500/10',   accent: 'text-orange-400',  bg: 'bg-orange-500/10' },
  mma:               { gradient: 'from-red-600/20 to-orange-500/10',   accent: 'text-red-400',     bg: 'bg-red-500/10' },
  general_fitness:   { gradient: 'from-teal-500/20 to-cyan-500/10',    accent: 'text-teal-400',    bg: 'bg-teal-500/10' },
};

const fallbackStyle = { gradient: 'from-primary-500/20 to-accent-500/10', accent: 'text-primary-400', bg: 'bg-primary-500/10' };

export default function KnowledgeHub({ onClose, initialCategory }: { onClose?: () => void; initialCategory?: ContentCategory }) {
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { readArticles, bookmarkedArticles, markArticleRead, toggleBookmarkArticle } = useAppStore(
    useShallow(s => ({
      readArticles: s.readArticles,
      bookmarkedArticles: s.bookmarkedArticles,
      markArticleRead: s.markArticleRead,
      toggleBookmarkArticle: s.toggleBookmarkArticle,
    }))
  );

  const readSet = useMemo(() => new Set(readArticles), [readArticles]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedArticles), [bookmarkedArticles]);

  // Group articles by category
  const grouped = useMemo(() => {
    const map = new Map<ContentCategory, KnowledgeArticle[]>();
    for (const a of knowledgeArticles) {
      const list = map.get(a.category) || [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return knowledgeArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      (categoryInfo[a.category]?.name || '').toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const featured = useMemo(() => getFeaturedArticle(), []);

  // Scroll to the target category on mount
  useEffect(() => {
    if (initialCategory) {
      requestAnimationFrame(() => {
        const el = categoryRefs.current.get(initialCategory);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [initialCategory]);

  const handleOpenArticle = useCallback((article: KnowledgeArticle) => {
    setSelectedArticle(article);
    markArticleRead(article.id);
  }, [markArticleRead]);

  // ─── ARTICLE READER VIEW ────────────────────────────────────────────
  if (selectedArticle) {
    return (
      <ArticleReader
        article={selectedArticle}
        isBookmarked={bookmarkSet.has(selectedArticle.id)}
        onToggleBookmark={() => toggleBookmarkArticle(selectedArticle.id)}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  // ─── LIBRARY VIEW ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grappler-900 px-4 pt-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-grappler-50">Knowledge Hub</h2>
          <p className="text-xs text-grappler-500 mt-1">Science-backed training wisdom</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(v => !v)}
            className={cn(
              'p-2 rounded-xl transition-colors',
              searchOpen ? 'bg-primary-500/20 text-primary-400' : 'text-grappler-400 hover:text-grappler-200'
            )}
          >
            <Search className="w-5 h-5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-grappler-400 hover:text-grappler-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full bg-grappler-800 border border-grappler-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-grappler-100 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grappler-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search results */}
      {searchQuery.trim() ? (
        <div className="space-y-2">
          <p className="text-xs text-grappler-500 px-1">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
          {searchResults.length > 0 ? (
            searchResults.map(a => (
              <ArticleRow key={a.id} article={a} isRead={readSet.has(a.id)} onTap={handleOpenArticle} />
            ))
          ) : (
            <div className="text-center py-8 text-grappler-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No articles match that search.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Featured article — hero card */}
          <button
            onClick={() => handleOpenArticle(featured)}
            className="w-full text-left"
          >
            <div className={cn(
              'rounded-2xl p-5 border border-primary-500/20 bg-gradient-to-br',
              CAT_STYLE[featured.category]?.gradient || fallbackStyle.gradient,
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Featured</span>
              </div>
              <h3 className="text-base font-bold text-grappler-50 leading-snug">
                {featured.title}
              </h3>
              <div className="flex items-center gap-3 mt-2.5 text-xs text-grappler-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {featured.readTime} min
                </span>
                <span>{categoryInfo[featured.category]?.icon} {categoryInfo[featured.category]?.name}</span>
              </div>
            </div>
          </button>

          {/* Category sections — vertical card grid */}
          {Array.from(grouped.entries()).map(([cat, articles]) => {
            const info = categoryInfo[cat];
            const style = CAT_STYLE[cat] || fallbackStyle;
            if (!info) return null;
            return (
              <div key={cat} ref={el => { if (el) categoryRefs.current.set(cat, el); }} className="space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-2.5 px-1">
                  <span className="text-lg">{info.icon}</span>
                  <h3 className="text-base font-bold text-grappler-100">{info.name}</h3>
                  <span className="text-xs text-grappler-500 bg-grappler-800 px-2 py-0.5 rounded-full">{articles.length}</span>
                </div>

                {/* Vertical card list */}
                <div className="space-y-2.5">
                  {articles.map(a => {
                    const isRead = readSet.has(a.id);
                    const isBookmarked = bookmarkSet.has(a.id);
                    // Extract first meaningful line of content for preview
                    const preview = a.content.split('\n').find(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('-'))?.trim().slice(0, 120) || '';
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleOpenArticle(a)}
                        className={cn(
                          'w-full rounded-2xl p-4 text-left border transition-all active:scale-[0.98]',
                          'bg-gradient-to-br border-grappler-700/30 hover:border-grappler-600/50',
                          style.gradient,
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-grappler-50 leading-snug">
                              {a.title}
                            </h4>
                            {preview && (
                              <p className="text-xs text-grappler-400 mt-1.5 line-clamp-2 leading-relaxed">{preview}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-grappler-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {a.readTime} min read
                              </span>
                              {a.tags.length > 0 && (
                                <span className="truncate">{a.tags.slice(0, 2).join(' · ')}</span>
                              )}
                              {isRead && (
                                <span className="flex items-center gap-0.5 text-green-500 ml-auto flex-shrink-0">
                                  <Check className="w-3 h-3" />
                                  Read
                                </span>
                              )}
                            </div>
                          </div>
                          {isBookmarked && (
                            <BookmarkCheck className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Article Row (search results) ───────────────────────────────────────
function ArticleRow({ article, isRead, onTap }: { article: KnowledgeArticle; isRead: boolean; onTap: (a: KnowledgeArticle) => void }) {
  const info = categoryInfo[article.category];
  return (
    <button
      onClick={() => onTap(article)}
      className="w-full rounded-xl p-3 text-left bg-grappler-800/40 border border-grappler-700/30 hover:border-grappler-600/50 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{info?.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-grappler-100 leading-snug">{article.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-grappler-500">
            <span>{info?.name}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}m</span>
            {isRead && <span className="text-green-500 flex items-center gap-0.5"><Check className="w-3 h-3" />Read</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Article Reader — full-screen, magazine-quality ─────────────────────
function ArticleReader({
  article,
  isBookmarked,
  onToggleBookmark,
  onBack,
}: {
  article: KnowledgeArticle;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, pct)));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const info = categoryInfo[article.category];
  const style = CAT_STYLE[article.category] || fallbackStyle;

  return (
    <div className="fixed inset-0 z-50 bg-grappler-900 flex flex-col safe-area-top">
      {/* Reading progress bar */}
      <div className="h-0.5 bg-grappler-800 flex-shrink-0">
        <motion.div
          className="h-full bg-primary-500"
          style={{ width: `${scrollProgress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Sticky header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800/50 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 py-1">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleBookmark}
            className={cn(
              'p-2 rounded-xl transition-colors',
              isBookmarked ? 'text-primary-400' : 'text-grappler-500 hover:text-grappler-300'
            )}
          >
            {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-16">
          {/* Article header */}
          <div className="mb-8">
            <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-4', style.bg, style.accent)}>
              <span>{info?.icon}</span>
              {info?.name}
            </div>
            <h1 className="text-2xl font-bold text-grappler-50 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-xs text-grappler-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} min read
              </span>
              {article.source && (
                <span className="truncate max-w-[50%]">{article.source}</span>
              )}
            </div>
          </div>

          {/* Article body */}
          <ArticleContent content={article.content} />

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-grappler-800">
            <div className="flex items-center gap-3 flex-wrap">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs text-grappler-500 bg-grappler-800 px-2.5 py-1 rounded-lg">
                  {tag}
                </span>
              ))}
            </div>
            {article.source && (
              <p className="text-xs text-grappler-600 mt-4">Source: {article.source}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline text parser — handles **bold** inside any line ─────────────
function renderInlineMarkup(text: string) {
  if (!text.includes('**')) return text;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-grappler-100 font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── Article content renderer — proper markdown → JSX ──────────────────
function ArticleContent({ content }: { content: string }) {
  const lines = content.trim().split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // ## Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-bold text-grappler-100 mt-8 mb-1 first:mt-0">
              {trimmed.slice(3)}
            </h2>
          );
        }

        // ### Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-grappler-200 mt-5 mb-1">
              {trimmed.slice(4)}
            </h3>
          );
        }

        // Unordered list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="text-primary-500 mt-1.5 text-xs flex-shrink-0">{'●'}</span>
              <p className="text-sm text-grappler-300 leading-relaxed">{renderInlineMarkup(trimmed.slice(2))}</p>
            </div>
          );
        }

        // Ordered list
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\./)?.[1];
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="text-primary-400 font-semibold text-sm w-5 text-right flex-shrink-0">{num}.</span>
              <p className="text-sm text-grappler-300 leading-relaxed">{renderInlineMarkup(trimmed.replace(/^\d+\.\s/, ''))}</p>
            </div>
          );
        }

        // Regular paragraph (with inline bold support)
        return (
          <p key={i} className="text-sm text-grappler-300 leading-relaxed">
            {renderInlineMarkup(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
