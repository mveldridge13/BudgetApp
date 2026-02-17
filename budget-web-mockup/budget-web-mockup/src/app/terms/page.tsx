import Link from 'next/link';

const TrendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default function TermsOfServicePage() {
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">TREND Terms of Service</h1>
        <p className="text-gray-500 mb-2">Effective Date: November 13, 2025</p>
        <p className="text-gray-500 mb-8">Last Updated: February 16, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
          <p>
            Welcome to TREND (&quot;Trend&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of the TREND mobile and web applications, website, and related services (collectively, the &quot;Service&quot;).
          </p>
          <p>
            By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. Eligibility</h2>
            <p>You may use the Service only if you:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Are at least 13 years old (or the minimum age required in your jurisdiction)</li>
              <li>Have the legal capacity to enter into a binding agreement</li>
              <li>Are not prohibited from using the Service under applicable law</li>
            </ul>
            <p className="mt-3">If you use the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. Accounts</h2>
            <p>You must create an account to access certain features.</p>
            <p className="mt-3">You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain the confidentiality of your login credentials</li>
              <li>Be responsible for all activity under your account</li>
              <li>Notify us immediately of unauthorised access</li>
            </ul>
            <p className="mt-3">We may suspend or terminate accounts that violate these Terms or are used fraudulently.</p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. The Service</h2>
            <p>TREND is a personal finance tool that enables users to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Track income and expenses</li>
              <li>Categorise transactions</li>
              <li>Set and monitor savings goals</li>
              <li>View insights and analytics</li>
              <li>Manage budgets and recurring expenses</li>
            </ul>
            <p className="mt-3">Certain features may require payment of subscription fees or in-app purchases.</p>
            <p className="mt-3">TREND does not provide financial, legal, tax, or investment advice. You are solely responsible for your financial decisions.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. Subscriptions and Payments</h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 Paid Plans</h3>
            <p>TREND may offer paid subscriptions (&quot;Subscriptions&quot;), including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>TREND Pro (monthly or annual)</li>
              <li>Optional paid modules or add-ons (e.g., invoicing or advanced analytics)</li>
            </ul>
            <p className="mt-3">Pricing and features are displayed within the Service and may change over time.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 Billing and Auto-Renewal</h3>
            <p>Subscriptions are billed in advance on a recurring basis.</p>
            <p className="mt-3">Unless cancelled before the end of the billing period:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your Subscription will automatically renew</li>
              <li>The applicable platform or payment provider will charge the renewal fee</li>
            </ul>
            <p className="mt-3">You authorise recurring charges until cancellation.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.3 App Store Billing</h3>
            <p>If you purchase through the Apple App Store or Google Play Store:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Payments are processed by that platform</li>
              <li>Billing and refunds are governed by their terms</li>
            </ul>
            <p className="mt-3">TREND does not control third-party billing processes.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.4 Cancellation</h3>
            <p>You may cancel at any time through your app store or payment provider settings.</p>
            <p className="mt-3">Cancellation takes effect at the end of the current billing period.</p>
            <p className="mt-3">Deleting your account does not automatically cancel your Subscription.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.5 Refunds</h3>
            <p>Except as required by law, payments are non-refundable.</p>
            <p className="mt-3">For purchases made via app stores, refund requests must be submitted directly to the platform.</p>
            <p className="mt-3">Nothing in these Terms limits your rights under Australian Consumer Law.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.6 Price Changes</h3>
            <p>We may modify pricing at any time. If we do:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We will provide reasonable notice</li>
              <li>New pricing applies at your next renewal</li>
            </ul>
            <p className="mt-3">Continued use after renewal constitutes acceptance of the updated price.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. User Content</h2>
            <p>You retain ownership of data you enter into the Service (&quot;User Content&quot;).</p>
            <p className="mt-3">You grant TREND a limited licence to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Store and process your User Content</li>
              <li>Sync data across devices</li>
              <li>Create backups</li>
              <li>Provide and improve the Service</li>
            </ul>
            <p className="mt-3">We do not sell your financial data for advertising purposes. See our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> for details.</p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service unlawfully</li>
              <li>Attempt unauthorised access</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Use bots or automated systems to access the Service</li>
              <li>Transmit malware or harmful code</li>
              <li>Impersonate others</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">7. Intellectual Property</h2>
            <p>The Service, including its software, design, trademarks, and content (excluding User Content), is owned by TREND and protected by intellectual property laws.</p>
            <p className="mt-3">We grant you a limited, non-exclusive, non-transferable licence to use the Service for personal, non-commercial purposes.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">8. Third-Party Services</h2>
            <p>The Service may integrate with third-party services.</p>
            <p className="mt-3">We are not responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Third-party content or practices</li>
              <li>Loss or damage arising from third-party use</li>
            </ul>
            <p className="mt-3">Your use of third-party services is subject to their terms.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">9. Service Availability</h2>
            <p>We aim to maintain availability but do not guarantee uninterrupted access.</p>
            <p className="mt-3">We may modify, suspend, or discontinue the Service at any time.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">10. Disclaimers</h2>
            <p>The Service is provided &quot;as is&quot; and &quot;as available&quot;.</p>
            <p className="mt-3">To the maximum extent permitted by law, we disclaim all warranties, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy or reliability</li>
            </ul>
            <p className="mt-3">Use of the Service is at your own risk.</p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <p className="mt-3">TREND and its officers, directors, employees, and agents will not be liable for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Indirect, incidental, or consequential damages</li>
              <li>Loss of profits, data, or goodwill</li>
              <li>Service interruption or device damage</li>
            </ul>
            <p className="mt-3">Our total liability will not exceed the amount you paid us in the 12 months preceding the claim.</p>
            <p className="mt-3">Nothing in these Terms excludes rights that cannot be excluded under Australian Consumer Law.</p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">12. Indemnity</h2>
            <p>You agree to indemnify and hold TREND harmless from claims arising from:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your User Content</li>
            </ul>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">13. Termination</h2>
            <p>You may delete your account at any time within the app.</p>
            <p className="mt-3">We may suspend or terminate your account if:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You breach these Terms</li>
              <li>Your account is used unlawfully</li>
              <li>We are required by law</li>
              <li>We discontinue the Service</li>
            </ul>
            <p className="mt-3">Upon termination, your right to use the Service ceases immediately.</p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">14. Governing Law</h2>
            <p>These Terms are governed by the laws of Australia.</p>
            <p className="mt-3">Disputes will be resolved through good faith negotiation and, if necessary, Australian courts.</p>
            <p className="mt-3">You waive participation in class actions to the extent permitted by law.</p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">15. Changes to These Terms</h2>
            <p>We may update these Terms periodically.</p>
            <p className="mt-3">If changes are material, we will notify you through the Service or by email.</p>
            <p className="mt-3">Continued use after updates constitutes acceptance.</p>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">16. General</h2>
            <p>These Terms and our Privacy Policy constitute the entire agreement between you and TREND.</p>
            <p className="mt-3">If any provision is unenforceable, the remainder remains in effect.</p>
            <p className="mt-3">Failure to enforce a provision does not constitute waiver.</p>
            <p className="mt-3">We may assign our rights under these Terms without restriction.</p>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">17. Contact</h2>
            <p>For questions regarding these Terms:</p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> <a href="mailto:support@trendapp.co" className="text-indigo-600 hover:underline">support@trendapp.co</a></li>
              <li><strong>Website:</strong> <a href="https://www.trendapp.co" className="text-indigo-600 hover:underline">www.trendapp.co</a></li>
            </ul>
          </section>

          {/* Copyright */}
          <section className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-500">&copy; 2026 TREND. All rights reserved.</p>
          </section>
        </div>
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
