import React from 'react';
import { Helmet } from 'react-helmet';

const CancellationPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Cancellation Policy - ReadyNest</title>
        <meta name="description" content="Read ReadyNest's Cancellation Policy for home and business cleaning services, including deadlines, fees, and rescheduling options." />
      </Helmet>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 sm:p-10 lg:p-12">
        <h1 className="text-4xl font-extrabold text-center text-primary dark:text-sky-400 mb-8 sm:mb-10">Cancellation Policy</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Last Updated: January 11, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overview</h2>
          <p className="mb-4">
            At ReadyNest, we understand that plans can change. This Cancellation Policy outlines the procedures and terms for canceling or rescheduling your cleaning service with us. Our aim is to provide flexibility while ensuring fair compensation for our cleaning professionals and operational costs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Cancellation Deadlines and Fees</h2>
          <p className="mb-4">
            To avoid cancellation fees, please notify us within the specified timeframe:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>More than 48 Hours Notice:</strong> No cancellation fee will be charged.</li>
            <li><strong>Less than 48 Hours but More than 24 Hours Notice:</strong> A cancellation fee of 50% of the scheduled service cost will apply.</li>
            <li><strong>Less than 24 Hours Notice (or Same-Day Cancellation):</strong> A cancellation fee of 100% of the scheduled service cost will apply.</li>
            <li><strong>No-Show:</strong> If our cleaning professionals arrive at the scheduled time and cannot gain access to the property or you are not present, a 100% no-show fee of the scheduled service cost will be charged.</li>
          </ul>
          <p className="mt-4">
            For recurring cleaning services, canceling a single appointment with insufficient notice will incur the applicable fee, but your recurring service schedule will remain intact.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Rescheduling Your Service</h2>
          <p className="mb-4">
            We are happy to help you reschedule your service without a fee, provided you give us sufficient notice:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>More than 48 Hours Notice:</strong> You can reschedule your service to a new date and time without any additional charges, subject to availability.</li>
            <li><strong>Less than 48 Hours Notice:</strong> Rescheduling will be treated as a cancellation and rebooking. The applicable cancellation fee (as per Section 2) will be charged, and the new booking will be charged at the standard rate.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. How to Cancel or Reschedule</h2>
          <p className="mb-4">
            To cancel or reschedule your service, please use one of the following methods:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Online:</strong> Log in to your ReadyNest account and manage your bookings directly.</li>
            <li><strong>Email:</strong> Send an email to support@readynest.com with your booking reference number and requested change.</li>
            <li><strong>Phone:</strong> Call us at +973 33215180 during our business hours.</li>
          </ul>
          <p className="mt-4">
            Please ensure you receive a confirmation of your cancellation or rescheduling from ReadyNest to validate the change.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Refunds</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>If you cancel within the fee-free period, any pre-payments will be fully refunded to your original payment method within 5-7 business days.</li>
            <li>If a cancellation fee applies, it will be deducted from any pre-payment or charged to the payment method on file.</li>
            <li>Refunds are not provided for services already rendered.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Exceptional Circumstances</h2>
          <p className="mb-4">
            ReadyNest reserves the right to waive cancellation fees in cases of genuine emergencies or unforeseen circumstances (e.g., natural disasters, severe weather conditions). Such cases will be handled on a case-by-case basis at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Contact Us</h2>
          <p>
            If you have any questions regarding our Cancellation Policy, please contact us:
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

export default CancellationPolicyPage;