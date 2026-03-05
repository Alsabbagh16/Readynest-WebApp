import React from 'react';
import { Helmet } from 'react-helmet';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Privacy Policy - ReadyNest</title>
        <meta name="description" content="Read ReadyNest's Privacy Policy to understand how we collect, use, and protect your personal information for home and business cleaning services." />
      </Helmet>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 sm:p-10 lg:p-12">
        <h1 className="text-4xl font-extrabold text-center text-primary dark:text-sky-400 mb-8 sm:mb-10">Privacy Policy</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Last Updated: January 11, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to ReadyNest. We are committed to protecting your privacy and handling your personal information with transparency and respect. This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you use our website, online booking services, and cleaning services for homes and businesses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
          <p className="mb-4">We collect various types of information to provide and improve our services to you:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Personal Identification Information:</strong> Name, email address, phone number, physical address (for service delivery), payment information (e.g., credit card details, securely processed by third-party payment processors), and login credentials.</li>
            <li><strong>Booking Details:</strong> Service type, desired date and time, special instructions, property size, and recurrence preferences.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, operating system, referral sources, pages visited, and usage patterns on our website, collected through cookies and similar technologies.</li>
            <li><strong>Communication Data:</strong> Records of your correspondence with us, including emails, chat transcripts, and phone calls.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
          <p className="mb-4">Your information is used for the following purposes:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>To provide and manage the cleaning services you request, including scheduling, confirmations, and service delivery.</li>
            <li>To process payments and manage your account.</li>
            <li>To communicate with you about your bookings, inquiries, and service updates.</li>
            <li>To personalize your experience and improve our website and services.</li>
            <li>For internal record keeping, analytical purposes, and to monitor the effectiveness of our services.</li>
            <li>To comply with legal obligations and enforce our terms and policies.</li>
            <li>With your consent, to send promotional offers, newsletters, or marketing communications.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">4. How We Protect Your Information</h2>
          <p className="mb-4">
            We implement robust security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Encryption of data in transit and at rest.</li>
            <li>Secure Socket Layer (SSL) technology for all online transactions and communications.</li>
            <li>Access controls and internal policies to limit access to your data.</li>
            <li>Regular security assessments and updates to our systems.</li>
            <li>Working with reputable third-party service providers who adhere to strict security standards.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">5. Cookies and Tracking Technologies</h2>
          <p className="mb-4">
            Our website uses cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can manage your cookie preferences through your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">6. Sharing Your Information</h2>
          <p className="mb-4">We do not sell or rent your personal information to third parties. We may share your information with:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Service Providers:</strong> Trusted third parties who assist us in operating our business, such as payment processors, scheduling software, and email service providers. These providers are contractually obligated to protect your data and use it only for the purposes for which we disclose it to them.</li>
            <li><strong>Legal Requirements:</strong> When required by law or in response to valid requests by public authorities (e.g., a court order or government agency).</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            <li><strong>With Your Consent:</strong> We may share your information with other third parties when we have your explicit consent to do so.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">7. Your Rights</h2>
          <p className="mb-4">Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data.</li>
            <li><strong>Objection:</strong> Object to the processing of your personal data.</li>
            <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time where we rely on consent to process your personal information.</li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, please contact us using the details provided below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">8. Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any significant changes by posting the new policy on our website and updating the "Last Updated" date.
          </p>
        </section>

        <section>
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-4">9. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
            <li>Email: support@readynest.com</li>
            <li>Phone: +973 36500563</li>
            <li>Address: Block 213 Shaikh Isa Road, Road 51, Building 564, Flat 21, MUHARRAQ, CR 183715-1</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;