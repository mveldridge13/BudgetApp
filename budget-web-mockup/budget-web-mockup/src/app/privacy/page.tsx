import Link from 'next/link';

const TrendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">TREND Privacy Policy</h1>
        <p className="text-gray-500 mb-2">Effective Date: November 13, 2025</p>
        <p className="text-gray-500 mb-8">Last Updated: February 14, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
          <p>
            TREND (&quot;TREND,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to protecting your Personal Information. This Privacy Policy explains what information we collect, how we use it, how it is shared, and the rights and choices available to you when you use the TREND mobile and web applications (the &quot;Service&quot;).
          </p>
          <p>
            By using TREND, you acknowledge that you have read and understood this Privacy Policy.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. Data Controller</h2>
            <p>TREND is the data controller responsible for the processing of your Personal Information.</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. Information We Collect</h2>
            <p>We collect only the information necessary to provide budgeting, expense tracking, and account security features.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">A. Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>First and last name</li>
              <li>Email address</li>
              <li>Username (optional)</li>
              <li>Password (securely hashed and never stored in plain text)</li>
              <li>Time zone</li>
              <li>Currency preference</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">B. Financial Information (User-Provided)</h3>
            <p>Information you voluntarily enter into TREND, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Transactions and merchant details</li>
              <li>Budgets and categories</li>
              <li>Savings goals</li>
              <li>Income and recurring expenses</li>
              <li>Notes and descriptions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">C. Device and Technical Information</h3>
            <p>Collected for security, stability, and session management:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device model</li>
              <li>Operating system version</li>
              <li>App version</li>
              <li>IP address</li>
              <li>User agent</li>
              <li>Authentication tokens (securely stored on device)</li>
            </ul>
            <p className="mt-3">We do not use device fingerprinting or cross-app tracking technologies.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">D. Security Logs</h3>
            <p>To protect accounts and prevent unauthorized access:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Login attempts</li>
              <li>Session activity</li>
              <li>Password changes and resets</li>
              <li>Account lockouts</li>
              <li>Token refresh events</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">E. Diagnostics Data</h3>
            <p>Used solely to improve reliability:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Crash reports</li>
              <li>Error logs</li>
              <li>Performance metrics</li>
            </ul>
            <p className="mt-3">Diagnostics data is not used for advertising or tracking.</p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. How We Use Your Information</h2>
            <p>We use Personal Information only for legitimate business purposes, including to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Sync data across your devices</li>
              <li>Deliver budgeting insights (processed locally on your device)</li>
              <li>Secure accounts and prevent fraud</li>
              <li>Respond to support requests</li>
              <li>Send transactional or security communications</li>
              <li>Improve functionality and fix defects</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Local Processing</h3>
            <p>Spending insights and calculations occur locally on your device. Your financial data is not shared with AI or analytics services.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Password Security</h3>
            <p>Passwords may be checked against breach databases using privacy-preserving methods that never transmit your full password.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. Legal Basis for Processing (GDPR)</h2>
            <p>Where applicable under the GDPR, we rely on:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Contract performance</strong> – providing the Service</li>
              <li><strong>Legitimate interests</strong> – security, fraud prevention, reliability</li>
              <li><strong>Legal obligations</strong> – compliance with law</li>
              <li><strong>Consent</strong> – optional features (biometrics, notifications, marketing)</li>
            </ul>
            <p className="mt-3">You may withdraw consent at any time through app settings.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. Data Storage and Security</h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Local Storage</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encrypted on-device storage</li>
              <li>Secure keychain token storage</li>
              <li>Cache-first architecture for faster performance and offline access</li>
            </ul>
            <p className="mt-3">The app uses local caching to store your data on your device for quick access and offline functionality. Cached data is automatically refreshed in the background when connectivity is available.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Cloud Storage</h3>
            <p>Your data is encrypted in transit and stored on secure servers hosted by Amazon Web Services in the Asia Pacific (Sydney) region.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Security Measures</h3>
            <p>We implement administrative, technical, and organizational safeguards including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Strong password hashing</li>
              <li>TLS encryption</li>
              <li>Token rotation</li>
              <li>Rate limiting</li>
              <li>Account lockouts</li>
              <li>Secure infrastructure controls</li>
            </ul>
            <p className="mt-3">No system is 100% secure; however, we apply industry-standard protections.</p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">6. Data Sharing and Disclosure</h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">No Sale or Advertising</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>We do not sell, rent, or trade Personal Information.</li>
              <li>We do not use tracking technologies for advertising or cross-app profiling.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Service Providers</h3>
            <p>We use trusted vendors who process data solely on our behalf:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Amazon Web Services</strong> – hosting and email delivery</li>
              <li><strong>Sentry</strong> – crash reporting and diagnostics</li>
              <li><strong>Have I Been Pwned</strong> – password breach validation</li>
            </ul>
            <p className="mt-3">These providers are contractually required to safeguard your data.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Legal Requirements</h3>
            <p>We may disclose information where required by law or to protect safety, rights, or property.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">7. Your Rights and Choices</h2>
            <p>You may:</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Access</h3>
            <p>Request a copy of your data.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Correction</h3>
            <p>Update or edit your information within the app.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Deletion</h3>
            <p>Delete your account in-app:</p>
            <p className="font-mono bg-gray-100 px-3 py-2 rounded mt-2 inline-block">Settings → Account Management → Delete Account</p>
            <p className="mt-3">Upon deletion:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account is immediately deactivated</li>
              <li>Data removed from primary systems within 30 days</li>
              <li>Backups purged according to retention schedules</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Portability</h3>
            <p>Export your data in machine-readable format.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Session Control</h3>
            <p>View and revoke active sessions.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Communications</h3>
            <p>Opt out of non-essential messages.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Additional EU Rights</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Object to processing</li>
              <li>Restrict processing</li>
              <li>Lodge complaints with supervisory authorities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">California Rights</h3>
            <p>California residents may request disclosure or deletion of their Personal Information. TREND does not sell personal information.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">8. Children&apos;s Privacy</h2>
            <p>TREND is intended for general audiences and is not directed to children under 13.</p>
            <p>We do not knowingly collect information from children without appropriate consent.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">9. Data Retention</h2>
            <p>We retain Personal Information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>While your account remains active</li>
              <li>For up to 30 days after deletion</li>
              <li>Longer where legally required</li>
            </ul>
            <p className="mt-3">Security logs are retained for up to 90 days.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">10. Biometric Authentication</h2>
            <p>If enabled:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Biometric data never leaves your device</li>
              <li>Authentication is handled by your device&apos;s secure hardware</li>
              <li>TREND receives only success/failure confirmation</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">11. App Store Privacy Disclosures</h2>
            <p>Consistent with the requirements of Apple:</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Linked to You</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Contact information</li>
              <li>Identifiers</li>
              <li>Financial information</li>
              <li>Diagnostics</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Not Collected</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Location tracking</li>
              <li>Contacts</li>
              <li>Health</li>
              <li>Advertising data</li>
              <li>Cross-app tracking</li>
            </ul>
            <p className="mt-3">We do not track users for advertising.</p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">12. International Transfers</h2>
            <p>Your data may be processed in Australia or other regions where our service providers operate. Transfers comply with applicable legal safeguards, including Standard Contractual Clauses where required.</p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">13. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. Material changes will be communicated through the app or by email. Continued use constitutes acceptance.</p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">14. Contact Information</h2>
            <p>For privacy inquiries or requests:</p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> <a href="mailto:support@trendapp.co" className="text-indigo-600 hover:underline">support@trendapp.co</a></li>
              <li><strong>Website:</strong> <a href="https://www.trendapp.co" className="text-indigo-600 hover:underline">www.trendapp.co</a></li>
            </ul>
            <p className="mt-4">We respond within 30 days.</p>
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
