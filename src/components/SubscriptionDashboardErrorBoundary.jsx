import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

class SubscriptionDashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Subscription dashboard render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="mb-3 h-7 w-7 text-red-500" />
          <h2 className="font-bold text-slate-900">Subscription dashboard unavailable</h2>
          <p className="mt-1 text-sm text-slate-500">The dashboard could not be rendered.</p>
          <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SubscriptionDashboardErrorBoundary;
