import React from 'react';
import { Helmet } from 'react-helmet';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Terms of Service - ReadyNest</title>
        <meta name="description" content="Read ReadyNest's Terms of Service outlining the rules and conditions for using our home and business cleaning services and website." />
      </Helmet>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 sm:p-10 lg:p-12">
        <h1 className="text-4xl font-extrabold text-center text-primary dark:text-sky-400 mb-8 sm:mb-10">Terms of Service</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Last Updated: January 11, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using the ReadyNest website and services (collectively, "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use our Services. These Terms govern all use of our Services, whether you are a personal home client or a business client.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Description of Services</h2>
          <p className="mb-4">
            ReadyNest provides professional cleaning services for residential homes and commercial businesses. Our Services include, but are not limited to, general cleaning, deep cleaning, recurring cleaning, and specialized cleaning packages, as described on our website. Services are booked online and subject to availability and our operational policies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. User Responsibilities</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You must be at least 18 years old to book our Services.</li>
            <li>You agree to provide accurate, current, and complete information during the booking process and maintain its accuracy.</li>
            <li>You are responsible for ensuring that our cleaning professionals have safe and unobstructed access to the service location.</li>
            <li>You agree to secure all valuable, fragile, or sentimental items prior to our arrival.</li>
            <li>You acknowledge that ReadyNest is not responsible for damages resulting from pre-existing conditions or improper use of cleaning products/equipment not supplied by us.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Booking and Payment Terms</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Booking Confirmation:</strong> All bookings are subject to confirmation by ReadyNest. We reserve the right to decline any booking at our discretion.</li>
            <li><strong>Pricing:</strong> Service prices are as listed on our website or as quoted for custom services. Prices are subject to change.</li>
            <li><strong>Payment:</strong> Payment is due upon completion of service, unless otherwise agreed or for subscription plans. For online bookings, credit card information may be required to secure your appointment. Payment processing is handled by secure third-party providers.</li>
            <li><strong>Subscription Services:</strong> For recurring cleaning plans, payments will be automatically charged according to the agreed-upon schedule.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Cancellation and Rescheduling</h2>
          <p className="mb-4">
            Our Cancellation Policy, available on our website, details the terms and conditions for canceling or rescheduling services, including any applicable fees. By booking our Services, you agree to abide by this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">
            ReadyNest strives to provide excellent service. However, we shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses resulting from the use or inability to use the Services. Our total liability to you for any claim arising out of or relating to these Terms or our Services will not exceed the amount you paid to us for the Services in question.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Indemnification</h2>
          <p className="mb-4">
            You agree to indemnify, defend, and hold harmless ReadyNest, its affiliates, officers, directors, employees, and agents from any and all claims, liabilities, damages, losses, costs, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your infringement of any intellectual property or other right of any person or entity.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Service Modifications and Termination</h2>
          <p className="mb-4">
            ReadyNest reserves the right to modify, suspend, or discontinue any part of the Services at any time, with or without notice. We may also terminate or suspend your access to the Services, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Governing Law</h2>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the Kingdom of Bahrain, without regard to its conflict of law principles.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
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

export default TermsOfServicePage;