'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Lightbulb,
  ChevronRight,
  Clock,
  Tag,
  X,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  knowledgeArticles,
  workoutTips,
  categoryInfo,
  getArticlesByCategory,
  getFeaturedArticle
} from '@/lib/knowledge';
import { ContentCategory, KnowledgeArticle, KnowledgeTip } from '@/lib/types';

export default function KnowledgeHub() {
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = Object.entries(categoryInfo) as [ContentCategory, typeof categoryInfo[ContentCategory]][];

  const filteredArticles = knowledgeArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = getFeaturedArticle();

  // Get random tips
  const randomTips = workoutTips
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-grappler-50">Knowledge Hub</h2>
        <p className="text-sm text-grappler-400">Science-backed training wisdom</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grappler-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search articles and topics..."
          className="input pl-10"
        />
      </div>

      {/* Quick Tips */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-medium text-grappler-200">Quick Tips</h3>
        </div>
        <div className="space-y-3">
          {randomTips.map((tip) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-grappler-300 bg-grappler-800/50 rounded-lg p-3"
            >
              <p>{tip.content}</p>
              <p className="text-xs text-grappler-400 mt-1 capitalize">
                {categoryInfo[tip.category]?.name || tip.category}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-4 py-2 rounded-lg whitespace-nowrap transition-all',
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
          )}
        >
          All Topics
        </button>
        {categories.map(([key, info]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all',
              selectedCategory === key
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            <span>{info.icon}</span>
            {info.name}
          </button>
        ))}
      </div>

      {/* Featured Article */}
      {selectedCategory === 'all' && searchQuery === '' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 bg-gradient-to-br from-primary-500/20 to-accent-500/20 border-primary-500/30"
        >
          <span className="text-xs text-primary-400 font-medium uppercase tracking-wide">
            Featured Article
          </span>
          <h3 className="text-lg font-bold text-grappler-50 mt-2 mb-2">
            {featuredArticle.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-grappler-400 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {featuredArticle.readTime} min read
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {categoryInfo[featuredArticle.category]?.name}
            </span>
          </div>
          <button
            onClick={() => setSelectedArticle(featuredArticle)}
            className="btn btn-primary btn-sm gap-2"
          >
            Read Article
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Article List */}
      <div className="space-y-3">
        {filteredArticles.map((article, i) => (
          <motion.button
            key={article.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedArticle(article)}
            className="w-full card p-4 text-left hover:bg-grappler-700/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{categoryInfo[article.category]?.icon}</span>
                  <span className="text-xs text-grappler-400 capitalize">
                    {categoryInfo[article.category]?.name}
                  </span>
                </div>
                <h4 className="font-medium text-grappler-100 mb-1">{article.title}</h4>
                <div className="flex items-center gap-3 text-xs text-grappler-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime} min
                  </span>
                  <div className="flex gap-1">
                    {article.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-grappler-700 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-grappler-500 flex-shrink-0" />
            </div>
          </motion.button>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12 text-grappler-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No articles found matching your search.</p>
        </div>
      )}

      {/* Article Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-grappler-900/95 overflow-y-auto"
          >
            <div className="min-h-screen px-4 py-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-grappler-900/90 backdrop-blur-xl py-2 -mx-4 px-4">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="btn btn-ghost btn-sm"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-sm text-grappler-400">
                  <Clock className="w-4 h-4" />
                  {selectedArticle.readTime} min read
                </div>
              </div>

              {/* Article Content */}
              <article className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{categoryInfo[selectedArticle.category]?.icon}</span>
                    <span className="text-sm text-grappler-400 capitalize">
                      {categoryInfo[selectedArticle.category]?.name}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-grappler-50 mb-4">
                    {selectedArticle.title}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-grappler-800 text-grappler-400 px-3 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="prose prose-invert prose-primary max-w-none">
                  <ArticleContent content={selectedArticle.content} />
                </div>

                {selectedArticle.source && (
                  <div className="mt-8 pt-4 border-t border-grappler-700">
                    <p className="text-xs text-grappler-400">
                      Source: {selectedArticle.source}
                    </p>
                  </div>
                )}
              </article>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple markdown-like renderer for article content
function ArticleContent({ content }: { content: string }) {
  const lines = content.trim().split('\n');

  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return null;

        // Headers
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-xl font-bold text-grappler-100 mt-6 mb-3">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg font-semibold text-grappler-200 mt-4 mb-2">
              {trimmed.slice(4)}
            </h3>
          );
        }

        // List items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={i} className="text-grappler-300 ml-4 list-disc">
              {trimmed.slice(2)}
            </li>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <li key={i} className="text-grappler-300 ml-4 list-decimal">
              {trimmed.replace(/^\d+\.\s/, '')}
            </li>
          );
        }

        // Bold text
        if (trimmed.includes('**')) {
          const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
          return (
            <p key={i} className="text-grappler-300">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="text-grappler-100 font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="text-grappler-300 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
