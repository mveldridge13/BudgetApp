/**
 * HELP ARTICLE TEMPLATE
 *
 * To create a new help article:
 *
 * 1. Create folder: /src/app/docs/[category]/[article-slug]/
 * 2. Copy this file to that folder as page.tsx
 * 3. Fill in the content below
 * 4. Add images to: /public/docs/images/[article-slug]/
 * 5. Update /src/app/docs/page.tsx to list your new article
 *
 * Image naming convention: step-1.png, step-2.png, etc.
 */

import HelpArticle from '@/components/docs/HelpArticle';

export default function ArticlePage() {
  return (
    <HelpArticle
      title="Article Title Here"
      description="A brief description of what this guide covers and what the user will learn."
      lastUpdated="17 February 2026"
      steps={[
        {
          title: 'Step 1 Title',
          description: 'Explain what the user needs to do in this step.',
          image: '/docs/images/article-slug/step-1.png',
          imageAlt: 'Description of the image for accessibility',
          // tip: 'Optional helpful tip for this step',
          // warning: 'Optional warning or important note',
        },
        {
          title: 'Step 2 Title',
          description: 'Explain the next action.',
          image: '/docs/images/article-slug/step-2.png',
          imageAlt: 'Description of the image',
        },
        {
          title: 'Step 3 Title',
          description: 'Continue with more steps as needed.',
          image: '/docs/images/article-slug/step-3.png',
          imageAlt: 'Description of the image',
          tip: 'A helpful tip can make the process easier.',
        },
      ]}
      relatedArticles={[
        { title: 'Related Article 1', href: '/docs/category/article-1' },
        { title: 'Related Article 2', href: '/docs/category/article-2' },
      ]}
    />
  );
}
