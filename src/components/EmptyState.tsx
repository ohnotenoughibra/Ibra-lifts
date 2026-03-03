'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-grappler-800/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-grappler-400" />
      </div>
      <h3 className="text-lg font-semibold text-grappler-100 mb-2">{title}</h3>
      <p className="text-sm text-grappler-400 max-w-xs mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary btn-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
