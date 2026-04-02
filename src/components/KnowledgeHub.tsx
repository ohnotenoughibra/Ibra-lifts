'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Search,
  Bookmark,
  BookmarkCheck,
  Check,
  Sparkles,
  GraduationCap,
  Zap,
  ArrowRight,
  TrendingUp,
  Star,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  knowledgeArticles,
  categoryInfo,
  learningPaths,
} from '@/lib/knowledge';
import { pickFeaturedArticle, getRelatedArticles } from '@/lib/knowledge-engine';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import type { ContentCategory, KnowledgeArticle, LearningPath } from '@/lib/types';
import type { OverlayView } from './dashboard-types';

// ── Category gradient map ────────────────────────────────────────────────
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

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  intermediate: { label: 'Intermediate', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  advanced:     { label: 'Advanced',     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

// ── Main Component ───────────────────────────────────────────────────────
interface KnowledgeHubProps {
  onClose?: () => void;
  initialCategory?: ContentCategory;
  onNavigate?: (view: OverlayView) => void;
}

export default function KnowledgeHub({ onClose, initialCategory, onNavigate }: KnowledgeHubProps) {
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const {
    readArticles, bookmarkedArticles, markArticleRead, toggleBookmarkArticle,
    workoutLogs, injuryLog, competitions, weightCutPlans, currentMesocycle, activeDietPhase,
  } = useAppStore(
    useShallow(s => ({
      readArticles: s.readArticles,
      bookmarkedArticles: s.bookmarkedArticles,
      markArticleRead: s.markArticleRead,
      toggleBookmarkArticle: s.toggleBookmarkArticle,
      workoutLogs: s.workoutLogs,
      injuryLog: s.injuryLog,
      competitions: s.competitions,
      weightCutPlans: s.weightCutPlans,
      currentMesocycle: s.currentMesocycle,
      activeDietPhase: s.activeDietPhase,
    }))
  );

  const readSet = useMemo(() => new Set(readArticles), [readArticles]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedArticles), [bookmarkedArticles]);

  // Reading stats
  const totalArticles = knowledgeArticles.length;
  const readCount = readSet.size;

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

  // Full-text search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const words = q.split(/\s+/);
    return knowledgeArticles
      .map(a => {
        const haystack = `${a.title} ${a.tldr} ${a.tags.join(' ')} ${a.content} ${categoryInfo[a.category]?.name || ''}`.toLowerCase();
        if (!words.every(w => haystack.includes(w))) return null;
        let score = 0;
        const titleLower = a.title.toLowerCase();
        for (const w of words) {
          if (titleLower.includes(w)) score += 10;
          if (a.tags.some(t => t.toLowerCase().includes(w))) score += 5;
        }
        return { article: a, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .map(s => s!.article);
  }, [searchQuery]);

  // Context-aware featured article
  const featured = useMemo(() => {
    const hasActiveInjury = (injuryLog ?? []).some(i => !i.resolved && !i._deleted);
    const hasFightCamp = (competitions ?? []).some(c => c.isActive && !c._deleted);
    const isDeload = false; // Could compute from mesocycle
    const mesocycleWeek = currentMesocycle
      ? Math.floor((Date.now() - new Date(currentMesocycle.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
      : null;
    return pickFeaturedArticle(knowledgeArticles, {
      hasActiveInjury,
      hasFightCamp,
      isDeload,
      activeDietPhase: activeDietPhase?.goal === 'cut' ? 'cut' : activeDietPhase?.goal === 'bulk' ? 'bulk' : activeDietPhase?.goal === 'maintain' ? 'maintain' : null,
      mesocycleWeek,
    }, readArticles);
  }, [injuryLog, competitions, currentMesocycle, activeDietPhase, readArticles]);

  // Scroll to target category on mount
  useEffect(() => {
    if (initialCategory) {
      requestAnimationFrame(() => {
        const el = categoryRefs.current.get(initialCategory);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [initialCategory]);

  const handleOpenArticle = useCallback((article: KnowledgeArticle) => {
    hapticLight();
    setSelectedArticle(article);
    markArticleRead(article.id);
  }, [markArticleRead]);

  const handleNavigateOverlay = useCallback((overlayId: string) => {
    if (onNavigate) {
      onNavigate(overlayId as OverlayView);
    } else if (onClose) {
      onClose();
    }
  }, [onNavigate, onClose]);

  // ─── LEARNING PATH VIEW ──────────────────────────────────────────────
  if (activePathId) {
    const path = (learningPaths ?? []).find(p => p.id === activePathId);
    if (path) {
      return (
        <LearningPathView
          path={path}
          readSet={readSet}
          onOpenArticle={handleOpenArticle}
          onBack={() => setActivePathId(null)}
        />
      );
    }
  }

  // ─── ARTICLE READER VIEW ────────────────────────────────────────────
  if (selectedArticle) {
    return (
      <ArticleReader
        article={selectedArticle}
        isBookmarked={bookmarkSet.has(selectedArticle.id)}
        onToggleBookmark={() => toggleBookmarkArticle(selectedArticle.id)}
        onBack={() => setSelectedArticle(null)}
        onOpenRelated={handleOpenArticle}
        onNavigateOverlay={handleNavigateOverlay}
      />
    );
  }

  // ─── LIBRARY VIEW ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grappler-900 px-4 pt-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-grappler-50">Knowledge Hub</h2>
          <p className="text-xs text-grappler-500 mt-1">
            {readCount}/{totalArticles} articles read
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { hapticLight(); setSearchOpen(v => !v); }}
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

      {/* Reading progress bar */}
      {readCount > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-grappler-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
              initial={false}
              animate={{ width: `${(readCount / totalArticles) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

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
                placeholder="Search all articles..."
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
              <ArticleCard key={a.id} article={a} isRead={readSet.has(a.id)} isBookmarked={bookmarkSet.has(a.id)} onTap={handleOpenArticle} />
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
          {/* Featured article — context-aware hero */}
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
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Recommended for you</span>
              </div>
              <h3 className="text-base font-bold text-grappler-50 leading-snug">
                {featured.title}
              </h3>
              {featured.tldr && (
                <p className="text-xs text-grappler-300 mt-1.5 leading-relaxed">{featured.tldr}</p>
              )}
              <div className="flex items-center gap-3 mt-2.5 text-xs text-grappler-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {featured.readTime} min
                </span>
                <span>{categoryInfo[featured.category]?.icon} {categoryInfo[featured.category]?.name}</span>
                {featured.difficulty && (
                  <DifficultyBadge difficulty={featured.difficulty} />
                )}
                {readSet.has(featured.id) && (
                  <span className="flex items-center gap-0.5 text-green-500 ml-auto">
                    <Check className="w-3 h-3" />
                    Read
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Learning Paths */}
          {(learningPaths ?? []).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Route className="w-4 h-4 text-primary-400" />
                <h3 className="text-base font-bold text-grappler-100">Learning Paths</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                {(learningPaths ?? []).map(path => {
                  const completedCount = path.articleIds.filter(id => readSet.has(id)).length;
                  const progress = path.articleIds.length > 0 ? completedCount / path.articleIds.length : 0;
                  return (
                    <button
                      key={path.id}
                      onClick={() => { hapticMedium(); setActivePathId(path.id); }}
                      className="flex-shrink-0 w-56 rounded-2xl p-4 text-left border border-grappler-700/30 bg-grappler-800/40 active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{path.icon}</span>
                        <DifficultyBadge difficulty={path.difficulty} />
                      </div>
                      <h4 className="text-sm font-semibold text-grappler-100 leading-snug">{path.title}</h4>
                      <p className="text-xs text-grappler-500 mt-1 line-clamp-1">{path.description}</p>
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-grappler-400">{completedCount}/{path.articleIds.length} articles</span>
                          {progress === 1 && (
                            <span className="text-green-400 flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              Complete
                            </span>
                          )}
                        </div>
                        <div className="h-1 bg-grappler-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                            initial={false}
                            animate={{ width: `${progress * 100}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bookmarked (if any) */}
          {bookmarkSet.size > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Bookmark className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-grappler-300">Bookmarked</h3>
                <span className="text-xs text-grappler-500">{bookmarkSet.size}</span>
              </div>
              <div className="space-y-2">
                {knowledgeArticles
                  .filter(a => bookmarkSet.has(a.id))
                  .map(a => (
                    <ArticleCard key={a.id} article={a} isRead={readSet.has(a.id)} isBookmarked onTap={handleOpenArticle} compact />
                  ))
                }
              </div>
            </div>
          )}

          {/* Category sections */}
          {Array.from(grouped.entries()).map(([cat, articles]) => {
            const info = categoryInfo[cat];
            const style = CAT_STYLE[cat] || fallbackStyle;
            if (!info) return null;
            const catReadCount = articles.filter(a => readSet.has(a.id)).length;
            return (
              <div key={cat} ref={el => { if (el) categoryRefs.current.set(cat, el); }} className="space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <span className="text-lg">{info.icon}</span>
                  <h3 className="text-base font-bold text-grappler-100">{info.name}</h3>
                  <span className="text-xs text-grappler-500 bg-grappler-800 px-2 py-0.5 rounded-full">
                    {catReadCount}/{articles.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {articles.map(a => (
                    <ArticleCard
                      key={a.id}
                      article={a}
                      isRead={readSet.has(a.id)}
                      isBookmarked={bookmarkSet.has(a.id)}
                      onTap={handleOpenArticle}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Difficulty Badge ─────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  if (!config) return null;
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border', config.color)}>
      {config.label}
    </span>
  );
}

// ── Article Card ─────────────────────────────────────────────────────────
function ArticleCard({
  article, isRead, isBookmarked, onTap, compact
}: {
  article: KnowledgeArticle;
  isRead: boolean;
  isBookmarked?: boolean;
  onTap: (a: KnowledgeArticle) => void;
  compact?: boolean;
}) {
  const style = CAT_STYLE[article.category] || fallbackStyle;
  return (
    <button
      onClick={() => onTap(article)}
      className={cn(
        'w-full rounded-2xl text-left border transition-all active:scale-[0.98]',
        'bg-gradient-to-br border-grappler-700/30 hover:border-grappler-600/50',
        style.gradient,
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-grappler-50 leading-snug', compact ? 'text-xs' : 'text-sm')}>
            {article.title}
          </h4>
          {!compact && article.tldr && (
            <p className="text-xs text-grappler-400 mt-1.5 line-clamp-2 leading-relaxed">{article.tldr}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-grappler-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime}m
            </span>
            {article.difficulty && <DifficultyBadge difficulty={article.difficulty} />}
            {article.tags.length > 0 && !compact && (
              <span className="truncate max-w-[120px]">{article.tags.slice(0, 2).join(' · ')}</span>
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
}

// ── Learning Path View ───────────────────────────────────────────────────
function LearningPathView({
  path, readSet, onOpenArticle, onBack,
}: {
  path: LearningPath;
  readSet: Set<string>;
  onOpenArticle: (a: KnowledgeArticle) => void;
  onBack: () => void;
}) {
  const articles = path.articleIds
    .map(id => knowledgeArticles.find(a => a.id === id))
    .filter(Boolean) as KnowledgeArticle[];

  const completedCount = articles.filter(a => readSet.has(a.id)).length;
  const progress = articles.length > 0 ? completedCount / articles.length : 0;

  // Find next unread article
  const nextUnread = articles.find(a => !readSet.has(a.id));

  return (
    <div className="min-h-screen bg-grappler-900 px-4 pt-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-grappler-400 hover:text-grappler-200">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{path.icon}</span>
            <h2 className="text-lg font-bold text-grappler-50">{path.title}</h2>
          </div>
          <p className="text-xs text-grappler-500 mt-0.5">{path.description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-grappler-400">{completedCount} of {articles.length} complete</span>
          <DifficultyBadge difficulty={path.difficulty} />
        </div>
        <div className="h-2 bg-grappler-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        {progress === 1 && (
          <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
            <Star className="w-3.5 h-3.5" />
            Path complete! You've mastered this topic.
          </div>
        )}
      </div>

      {/* Continue reading CTA */}
      {nextUnread && progress < 1 && (
        <button
          onClick={() => onOpenArticle(nextUnread)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider">Continue reading</p>
            <p className="text-sm text-grappler-100 font-medium truncate mt-0.5">{nextUnread.title}</p>
          </div>
        </button>
      )}

      {/* Article sequence */}
      <div className="space-y-1">
        {articles.map((a, i) => {
          const isRead = readSet.has(a.id);
          const isCurrent = a.id === nextUnread?.id;
          return (
            <button
              key={a.id}
              onClick={() => onOpenArticle(a)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]',
                isCurrent
                  ? 'bg-primary-500/10 border border-primary-500/30'
                  : 'border border-transparent hover:bg-grappler-800/40'
              )}
            >
              {/* Step number / check */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border',
                isRead
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : isCurrent
                    ? 'bg-primary-500/20 border-primary-500/30 text-primary-400'
                    : 'bg-grappler-800 border-grappler-700 text-grappler-500'
              )}>
                {isRead ? <Check className="w-4 h-4" /> : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  'text-sm font-medium leading-snug',
                  isRead ? 'text-grappler-400' : 'text-grappler-100'
                )}>
                  {a.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-grappler-500">
                  <span>{a.readTime}m read</span>
                  {a.difficulty && <DifficultyBadge difficulty={a.difficulty} />}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-grappler-600 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Article Reader ───────────────────────────────────────────────────────
function ArticleReader({
  article, isBookmarked, onToggleBookmark, onBack, onOpenRelated, onNavigateOverlay,
}: {
  article: KnowledgeArticle;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  onOpenRelated: (a: KnowledgeArticle) => void;
  onNavigateOverlay: (overlayId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // The article renders inside the overlay-safe container which is the scroll parent
    const el = scrollRef.current?.closest('[data-overlay-container]') as HTMLElement
      ?? scrollRef.current?.closest('.overlay-safe') as HTMLElement;
    if (!el) return;
    const handler = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, isFinite(pct) ? pct : 0)));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Scroll to top when article changes
  useEffect(() => {
    const el = scrollRef.current?.closest('[data-overlay-container]') as HTMLElement
      ?? scrollRef.current?.closest('.overlay-safe') as HTMLElement;
    el?.scrollTo(0, 0);
    setScrollProgress(0);
  }, [article.id]);

  const info = categoryInfo[article.category];
  const style = CAT_STYLE[article.category] || fallbackStyle;

  const relatedArticles = useMemo(
    () => getRelatedArticles(article, knowledgeArticles, 3),
    [article]
  );

  return (
    <div className="min-h-screen bg-grappler-900">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm">
        <div className="h-0.5 bg-grappler-800">
          <motion.div
            className="h-full bg-primary-500"
            style={{ width: `${scrollProgress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800/50">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 py-1 min-h-[44px]">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => { hapticLight(); onToggleBookmark(); }}
            className={cn(
              'p-2 rounded-xl transition-colors min-h-[44px]',
              isBookmarked ? 'text-primary-400' : 'text-grappler-500 hover:text-grappler-300'
            )}
          >
            {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="max-w-lg mx-auto px-5 pt-6 pb-24">
          {/* Article header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', style.bg, style.accent)}>
                <span>{info?.icon}</span>
                {info?.name}
              </div>
              {article.difficulty && <DifficultyBadge difficulty={article.difficulty} />}
            </div>
            <h1 className="text-2xl font-bold text-grappler-50 leading-tight">
              {article.title}
            </h1>
            {article.tldr && (
              <p className="text-sm text-grappler-300 mt-3 leading-relaxed bg-grappler-800/40 rounded-xl px-4 py-3 border-l-2 border-primary-500/50">
                {article.tldr}
              </p>
            )}
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

          {/* Key Takeaways */}
          {article.keyTakeaways && article.keyTakeaways.length > 0 && (
            <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/5 border border-primary-500/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-primary-300 uppercase tracking-wider">Key Takeaways</h3>
              </div>
              <div className="space-y-2.5">
                {article.keyTakeaways.map((t, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary-400" />
                    </div>
                    <p className="text-sm text-grappler-200 leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply This CTA */}
          {article.applyCta && (
            <button
              onClick={() => { hapticMedium(); onNavigateOverlay(article.applyCta!.overlayId); }}
              className="mt-6 w-full flex items-center justify-between p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider">Apply this</p>
                  <p className="text-sm text-grappler-100 font-medium">{article.applyCta.label}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary-400" />
            </button>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-10 space-y-3">
              <h3 className="text-sm font-bold text-grappler-300 uppercase tracking-wider px-1">
                Keep reading
              </h3>
              {relatedArticles.map(a => {
                const s = CAT_STYLE[a.category] || fallbackStyle;
                const rInfo = categoryInfo[a.category];
                return (
                  <button
                    key={a.id}
                    onClick={() => onOpenRelated(a)}
                    className={cn(
                      'w-full rounded-xl p-3.5 text-left border transition-all active:scale-[0.98]',
                      'bg-gradient-to-br border-grappler-700/30 hover:border-grappler-600/50',
                      s.gradient,
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{rInfo?.icon}</span>
                      <span className="text-xs text-grappler-500">{rInfo?.name}</span>
                      {a.difficulty && <DifficultyBadge difficulty={a.difficulty} />}
                    </div>
                    <h4 className="text-sm font-semibold text-grappler-100 leading-snug">{a.title}</h4>
                    <p className="text-xs text-grappler-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.readTime} min read
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer tags + source */}
          <div className="mt-12 pt-6 border-t border-grappler-800">
            <div className="flex items-center gap-2 flex-wrap">
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
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- structural marker
// ── Inline text parser — handles **bold** ────────────────────────────────
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

// ── Article content renderer — full markdown → JSX ───────────────────────
function ArticleContent({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // ## Heading 2
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-grappler-100 mt-8 mb-1 first:mt-0">
          {renderInlineMarkup(trimmed.slice(3))}
        </h2>
      );
      i++; continue;
    }

    // ### Heading 3
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-grappler-200 mt-5 mb-1">
          {renderInlineMarkup(trimmed.slice(4))}
        </h3>
      );
      i++; continue;
    }

    // --- Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="border-grappler-800 my-6" />);
      i++; continue;
    }

    // > Blockquote / callout
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      const quoteText = quoteLines.join(' ');
      // Detect warning/info callouts
      const isWarning = quoteText.startsWith('⚠️') || quoteText.toLowerCase().startsWith('warning');
      const isInfo = quoteText.startsWith('💡') || quoteText.startsWith('ℹ️');
      elements.push(
        <div
          key={`bq-${i}`}
          className={cn(
            'rounded-xl px-4 py-3 my-3 border-l-3',
            isWarning
              ? 'bg-amber-500/10 border-l-amber-500/50 text-amber-200'
              : isInfo
                ? 'bg-blue-500/10 border-l-blue-500/50 text-blue-200'
                : 'bg-grappler-800/40 border-l-primary-500/50 text-grappler-300'
          )}
        >
          <p className="text-sm leading-relaxed italic">{renderInlineMarkup(quoteText)}</p>
        </div>
      );
      continue;
    }

    // Table detection: | col | col |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        // Parse header
        const parseRow = (row: string) =>
          row.split('|').slice(1, -1).map(cell => cell.trim());

        const header = parseRow(tableLines[0]);
        // Skip separator row (|---|---|)
        const isSeparator = (row: string) => /^\|[\s\-:|]+\|$/.test(row);
        const dataStart = isSeparator(tableLines[1]) ? 2 : 1;
        const rows = tableLines.slice(dataStart).map(parseRow);

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-grappler-700/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-grappler-800/60">
                  {header.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 text-left text-xs font-semibold text-grappler-200 whitespace-nowrap">
                      {renderInlineMarkup(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-grappler-800/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-xs text-grappler-400 whitespace-nowrap">
                        {renderInlineMarkup(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Unordered list — collect consecutive items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l.startsWith('- ') || l.startsWith('* ')) {
          items.push(l.slice(2));
          i++;
        } else break;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5">
              <span className="text-primary-500 mt-1.5 text-xs flex-shrink-0">{'●'}</span>
              <p className="text-sm text-grappler-300 leading-relaxed">{renderInlineMarkup(item)}</p>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list — collect consecutive items
    if (/^\d+\.\s/.test(trimmed)) {
      const items: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const l = lines[i].trim();
        const num = l.match(/^(\d+)\./)?.[1] || '';
        items.push({ num, text: l.replace(/^\d+\.\s/, '') });
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5">
              <span className="text-primary-400 font-semibold text-sm w-5 text-right flex-shrink-0">{item.num}.</span>
              <p className="text-sm text-grappler-300 leading-relaxed">{renderInlineMarkup(item.text)}</p>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-grappler-300 leading-relaxed">
        {renderInlineMarkup(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-3">{elements}</div>;
}
