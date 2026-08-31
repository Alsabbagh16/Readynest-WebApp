import React from 'react';
import { Helmet } from 'react-helmet';

const PreferredSourcesButton = ({ className = '' }) => (
  <div className={className}>
    <Helmet>
      <script async src="https://news.google.com/swg/js/v1/publisher.js" />
    </Helmet>
    {React.createElement('div', { 'google-add-preferred-source-btn': '' })}
  </div>
);

export default PreferredSourcesButton;
