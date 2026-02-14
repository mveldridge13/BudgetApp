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
        <p className="text-gray-500 mb-8">Last Updated: February 14, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
          <p>
            Welcome to TREND. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the TREND mobile and web applications (the &quot;Service&quot;), operated by TREND (&quot;TREND,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>
          <p>
            By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Service.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. Eligibility</h2>
            <p>To use TREND, you must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Be at least 13 years of age (or the minimum age required in your jurisdiction)</li>
              <li>Have the legal capacity to enter into a binding agreement</li>
              <li>Not be prohibited from using the Service under applicable law</li>
            </ul>
            <p className="mt-3">If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. Account Registration</h2>
            <p>To access TREND, you must create an account by providing accurate and complete information. You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access or security breach</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate accounts that violate these Terms or are used for fraudulent purposes.</p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. Description of Service</h2>
            <p>TREND is a personal finance application that helps you:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Track income and expenses</li>
              <li>Categorize transactions</li>
              <li>Set and monitor savings goals</li>
              <li>View spending insights and analytics</li>
              <li>Manage budgets and recurring expenses</li>
            </ul>
            <p className="mt-3">TREND is a tool for personal financial management. We do not provide financial advice, investment recommendations, or professional accounting services. You are solely responsible for your financial decisions.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. User Data and Content</h2>
            <p>You retain ownership of all data and content you enter into TREND (&quot;User Content&quot;). By using the Service, you grant us a limited license to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Store and process your User Content to provide the Service</li>
              <li>Create backups to protect against data loss</li>
              <li>Sync your data across your devices</li>
            </ul>
            <p className="mt-3">We will not share, sell, or use your financial data for advertising purposes. See our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> for details on how we handle your information.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any illegal purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service</li>
              <li>Transmit viruses, malware, or other harmful code</li>
              <li>Impersonate another person or entity</li>
              <li>Use the Service to harass, abuse, or harm others</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">6. Intellectual Property</h2>
            <p>The Service, including its design, features, code, and content (excluding User Content), is owned by TREND and protected by intellectual property laws.</p>
            <p className="mt-3">You are granted a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes in accordance with these Terms.</p>
            <p className="mt-3">TREND, the TREND logo, and related marks are trademarks of TREND. You may not use these marks without our prior written consent.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">7. Third-Party Services</h2>
            <p>The Service may integrate with or contain links to third-party services. We are not responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The content, privacy practices, or terms of third-party services</li>
              <li>Any loss or damage arising from your use of third-party services</li>
            </ul>
            <p className="mt-3">Your use of third-party services is subject to their respective terms and policies.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">8. Service Availability</h2>
            <p>We strive to maintain the Service&apos;s availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Scheduled maintenance</li>
              <li>Technical issues or outages</li>
              <li>Factors beyond our reasonable control</li>
            </ul>
            <p className="mt-3">We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time, with or without notice.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">9. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>WARRANTIES OF MERCHANTABILITY</li>
              <li>FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>NON-INFRINGEMENT</li>
              <li>ACCURACY OR COMPLETENESS OF CONTENT</li>
            </ul>
            <p className="mt-3">We do not warrant that the Service will be error-free, secure, or meet your specific requirements. You use the Service at your own risk.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">10. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, TREND AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, or goodwill</li>
              <li>Service interruption or computer damage</li>
              <li>Any damages arising from your use of or inability to use the Service</li>
            </ul>
            <p className="mt-3">In no event shall our total liability exceed the amount you paid us (if any) in the twelve (12) months preceding the claim.</p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">11. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless TREND and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your User Content</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">12. Account Termination</h2>
            <p>You may delete your account at any time through:</p>
            <p className="font-mono bg-gray-100 px-3 py-2 rounded mt-2 inline-block">Settings → Account Management → Delete Account</p>
            <p className="mt-3">We may suspend or terminate your account if:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You violate these Terms</li>
              <li>Your account is used for fraudulent or illegal activity</li>
              <li>We are required to do so by law</li>
              <li>We discontinue the Service</li>
            </ul>
            <p className="mt-3">Upon termination, your right to use the Service ceases immediately. We may retain certain data as required by law or for legitimate business purposes.</p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">13. Governing Law and Disputes</h2>
            <p>These Terms are governed by the laws of Australia, without regard to conflict of law principles.</p>
            <p className="mt-3">Any disputes arising from these Terms or your use of the Service shall be resolved through:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Good faith negotiation between the parties</li>
              <li>If unresolved, through binding arbitration or the courts of Australia</li>
            </ul>
            <p className="mt-3">You waive any right to participate in a class action lawsuit or class-wide arbitration against TREND.</p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">14. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. When we make material changes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We will notify you through the app or by email</li>
              <li>The updated Terms will be posted with a new &quot;Last Updated&quot; date</li>
              <li>Continued use of the Service after changes constitutes acceptance</li>
            </ul>
            <p className="mt-3">If you do not agree to the updated Terms, you must stop using the Service and delete your account.</p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">15. General Provisions</h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Entire Agreement</h3>
            <p>These Terms, together with the Privacy Policy, constitute the entire agreement between you and TREND regarding the Service.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Severability</h3>
            <p>If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Waiver</h3>
            <p>Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Assignment</h3>
            <p>You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction.</p>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">16. Contact Information</h2>
            <p>For questions about these Terms:</p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> <a href="mailto:support@trendapp.co" className="text-indigo-600 hover:underline">support@trendapp.co</a></li>
              <li><strong>Website:</strong> <a href="https://www.trendapp.co" className="text-indigo-600 hover:underline">www.trendapp.co</a></li>
            </ul>
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
