import React from 'react';
import { Helmet } from 'react-helmet';
import { Sparkles, Users, Leaf, ShieldCheck } from 'lucide-react';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>About Us - ReadyNest</title>
        <meta name="description" content="Learn about ReadyNest's mission, values, and commitment to providing top-quality home and business cleaning services." />
      </Helmet>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 sm:p-10 lg:p-12">
        <h1 className="text-4xl font-extrabold text-center text-primary dark:text-sky-400 mb-8 sm:mb-10">About ReadyNest</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Your trusted partner for sparkling clean homes and professional business spaces. We blend expertise with care to deliver exceptional cleaning solutions.
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-primary" /> Our Mission
          </h2>
          <p className="mb-4">
            At ReadyNest, our mission is to simplify your life by providing reliable, high-quality cleaning services that create healthier, happier, and more productive environments. We believe a clean space is a foundation for well-being, and we are dedicated to achieving spotless results with every service.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Leaf className="mr-2 h-6 w-6 text-primary" /> Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Excellence</h3>
              <p className="text-gray-700 dark:text-gray-300">We are committed to delivering outstanding cleaning results that consistently exceed expectations.</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Reliability</h3>
              <p className="text-gray-700 dark:text-gray-300">You can count on us to be on time, every time, providing consistent and trustworthy service.</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Integrity</h3>
              <p className="text-gray-700 dark:text-gray-300">We operate with honesty, transparency, and a strong ethical compass in all our dealings.</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Customer Focus</h3>
              <p className="text-gray-700 dark:text-gray-300">Your satisfaction is our priority. We listen, adapt, and tailor our services to your specific needs.</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <ShieldCheck className="mr-2 h-6 w-6 text-primary" /> Why Choose ReadyNest?
          </h2>
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li><strong>Experienced Professionals:</strong> Our team consists of highly trained, vetted, and dedicated cleaning experts.</li>
            <li><strong>Customizable Services:</strong> We offer a range of flexible cleaning packages and add-ons to suit your unique requirements.</li>
            <li><strong>Eco-Friendly Options:</strong> Committed to sustainability, we provide environmentally responsible cleaning solutions upon request.</li>
            <li><strong>Convenient Booking:</strong> Easily schedule, manage, and pay for your services through our user-friendly online platform.</li>
            <li><strong>Guaranteed Satisfaction:</strong> We stand by the quality of our work. If you're not completely satisfied, we'll make it right.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" /> Our Team
          </h2>
          <p className="mb-4">
            Behind every spotless home and pristine office is our incredible team of cleaning specialists. Each member of the ReadyNest family is passionate about what they do, meticulously trained, and committed to upholding our high standards of quality and customer service. We foster a supportive and respectful work environment, which translates into the care and attention your property receives.
          </p>
          <p>
            We're not just cleaners; we're peace-of-mind providers.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUsPage;