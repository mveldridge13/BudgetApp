import HelpArticle from '@/components/docs/HelpArticle';

/**
 * TEMPLATE: How to create a help article
 *
 * 1. Create a new folder under /src/app/docs/[category]/[article-name]
 * 2. Copy this file as page.tsx
 * 3. Update the title, description, and steps below
 * 4. Add images to /public/docs/images/[article-name]/
 *    and reference them as '/docs/images/[article-name]/step-1.png'
 * 5. Update the docs index page (/src/app/docs/page.tsx) to include your new article
 */

export default function AddIncomePage() {
  return (
    <HelpArticle
      title="Adding Your First Income"
      description="Learn how to set up your income sources in Trend Budget so you can start tracking your spending and saving."
      lastUpdated="17 February 2026"
      steps={[
        {
          title: 'Open the Income Settings',
          description: 'From the dashboard, tap on the menu icon in the top-left corner, then select "Income" from the navigation menu.',
          // Add your screenshot path here:
          // image: '/docs/images/add-income/step-1.png',
          // imageAlt: 'Menu showing Income option highlighted',
          tip: 'You can also access Income settings by tapping on your balance card on the dashboard.',
        },
        {
          title: 'Tap "Add Income Source"',
          description: 'On the Income screen, you\'ll see your existing income sources (if any). Tap the "Add Income Source" button to create a new one.',
          // image: '/docs/images/add-income/step-2.png',
          // imageAlt: 'Add Income Source button',
        },
        {
          title: 'Enter Your Income Details',
          description: 'Fill in the details for your income source including the name (e.g., "Salary"), the amount you receive, and how often you get paid (weekly, fortnightly, or monthly).',
          // image: '/docs/images/add-income/step-3.png',
          // imageAlt: 'Income details form',
          tip: 'Enter your income after tax for more accurate budgeting.',
        },
        {
          title: 'Set Your Pay Day',
          description: 'Select the day of the week or date you typically receive this income. This helps Trend calculate your pay periods accurately.',
          // image: '/docs/images/add-income/step-4.png',
          // imageAlt: 'Pay day selector',
          warning: 'If your pay day falls on a weekend or public holiday, enter the day you usually receive the payment.',
        },
        {
          title: 'Save Your Income',
          description: 'Review your details and tap "Save" to add your income source. You\'ll now see it listed on your Income screen and your dashboard will update to reflect your new pay period.',
          // image: '/docs/images/add-income/step-5.png',
          // imageAlt: 'Save button and confirmation',
          tip: 'You can add multiple income sources if you have more than one job or receive other regular income.',
        },
      ]}
      relatedArticles={[
        { title: 'Setting Up Your Account', href: '/docs/getting-started/setup-account' },
        { title: 'Creating Your First Budget', href: '/docs/getting-started/create-budget' },
        { title: 'Adding a Transaction', href: '/docs/transactions/add-transaction' },
      ]}
    />
  );
}
