import HelpArticle from '@/components/docs/HelpArticle';

export default function AddTransactionPage() {
  return (
    <HelpArticle
      title="Adding a Transaction"
      description="Learn how to quickly add income or expenses to track your spending."
      lastUpdated="17 February 2026"
      steps={[
        {
          title: 'Tap the Add Button',
          description: 'From the home screen, tap the "+" button at the bottom of the screen to open the transaction form.',
          imageAlt: 'Add button on home screen',
        },
        {
          title: 'Enter the Amount',
          description: 'Type in the transaction amount using the keypad. You can switch between expense and income using the toggle at the top.',
          imageAlt: 'Transaction amount entry',
        },
        {
          title: 'Add Details and Save',
          description: 'Add a description, select a category, and tap Save to record your transaction.',
          imageAlt: 'Transaction details form',
          tip: 'Transactions are automatically dated to today, but you can change the date if needed.',
        },
      ]}
      relatedArticles={[
        { title: 'Editing Transactions', href: '/docs/transactions/edit-transaction' },
        { title: 'Categorising Transactions', href: '/docs/transactions/categories' },
      ]}
    />
  );
}
