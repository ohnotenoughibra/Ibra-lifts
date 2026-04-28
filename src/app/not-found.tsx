import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-grappler-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-lg bg-grappler-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-grappler-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-grappler-50 mb-2">Page not found</h2>
        <p className="text-sm text-grappler-400 mb-6">
          This page doesn&apos;t exist. The app is a single-page experience.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
