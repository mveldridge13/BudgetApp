import Link from 'next/link';

const TrendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// Define your help articles here
const helpCategories = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of using Trend Budget',
    articles: [
      { title: 'Setting Up Your Account', href: '/docs/getting-started/setup-account' },
      { title: 'Adding Your First Income', href: '/docs/getting-started/add-income' },
      { title: 'Creating Your First Budget', href: '/docs/getting-started/create-budget' },
    ],
  },
  {
    title: 'Transactions',
    description: 'Managing your income and expenses',
    articles: [
      { title: 'Adding a Transaction', href: '/docs/transactions/add-transaction' },
      { title: 'Editing Transactions', href: '/docs/transactions/edit-transaction' },
      { title: 'Categorising Transactions', href: '/docs/transactions/categories' },
    ],
  },
  {
    title: 'Goals',
    description: 'Set and track your savings goals',
    articles: [
      { title: 'Creating a Savings Goal', href: '/docs/goals/create-goal' },
      { title: 'Making Goal Contributions', href: '/docs/goals/contributions' },
      { title: 'Auto-Contributions', href: '/docs/goals/auto-contribute' },
    ],
  },
  {
    title: 'Settings',
    description: 'Customise your Trend experience',
    articles: [
      { title: 'Managing Your Profile', href: '/docs/settings/profile' },
      { title: 'Notification Preferences', href: '/docs/settings/notifications' },
      { title: 'Currency Settings', href: '/docs/settings/currency' },
    ],
  },
];

export default function DocsIndexPage() {
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Centre</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find step-by-step guides and answers to help you get the most out of Trend Budget.
          </p>
        </div>
      </div>

      {/* Categories */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {helpCategories.map((category, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {category.title}
              </h2>
              <p className="text-gray-500 text-sm mb-4">{category.description}</p>
              <ul className="space-y-2">
                {category.articles.map((article, articleIndex) => (
                  <li key={articleIndex}>
                    <Link
                      href={article.href}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <section className="mt-16 p-8 bg-gray-50 rounded-xl text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Can&apos;t find what you need?</h3>
          <p className="text-gray-600 mb-6">
            Our support team is here to help with any questions.
          </p>
          <a
            href="mailto:support@trendapp.co"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
