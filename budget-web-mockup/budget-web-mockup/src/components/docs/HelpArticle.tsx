'use client';

import Link from 'next/link';
import Image from 'next/image';

export interface HelpStep {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  tip?: string;
  warning?: string;
}

export interface HelpArticleProps {
  title: string;
  description: string;
  lastUpdated?: string;
  steps: HelpStep[];
  relatedArticles?: {
    title: string;
    href: string;
  }[];
}

const TrendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default function HelpArticle({
  title,
  description,
  lastUpdated,
  steps,
  relatedArticles
}: HelpArticleProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <TrendIcon className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Trend Budget</span>
            </Link>
            <Link
              href="/docs"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              All Help Articles
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/docs" className="hover:text-blue-600">Help Centre</Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium truncate">{title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-600">{description}</p>
          {lastUpdated && (
            <p className="text-sm text-gray-400 mt-2">Last updated: {lastUpdated}</p>
          )}
        </header>

        {/* Steps */}
        <div className="space-y-12">
          {steps.map((step, index) => (
            <section key={index} className="relative">
              {/* Step number indicator */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{step.description}</p>

                  {/* Image */}
                  {step.image && (
                    <div className="my-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <Image
                        src={step.image}
                        alt={step.imageAlt || step.title}
                        width={800}
                        height={450}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Tip box */}
                  {step.tip && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span className="font-medium text-blue-900">Tip: </span>
                          <span className="text-blue-800">{step.tip}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning box */}
                  {step.warning && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <span className="font-medium text-amber-900">Note: </span>
                          <span className="text-amber-800">{step.warning}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-14 bottom-0 w-px bg-gray-200 -translate-x-1/2" style={{ height: 'calc(100% - 3.5rem)' }} />
              )}
            </section>
          ))}
        </div>

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Articles</h3>
            <ul className="space-y-2">
              {relatedArticles.map((article, index) => (
                <li key={index}>
                  <Link
                    href={article.href}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Help footer */}
        <section className="mt-16 p-6 bg-gray-50 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-gray-600 mb-4">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <a
            href="mailto:support@trendapp.co"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-4xl mx-auto text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Trend Budget. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
