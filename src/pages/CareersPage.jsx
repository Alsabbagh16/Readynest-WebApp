import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CareersPage = () => (
  <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-12 sm:py-16">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase text-blue-600">Join ReadyNest</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Careers</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Choose the ReadyNest work opportunity that suits you.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-slate-200 bg-slate-100 text-slate-500 shadow-none" aria-disabled="true">
          <CardHeader>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl text-slate-500">Full-Time Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="min-h-12 text-sm leading-6 text-slate-500">
              There are currently no full-time positions open.
            </p>
            <Button type="button" variant="secondary" className="w-full" disabled>
              No Positions Open
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl text-slate-950">Part-Time Cleaning Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="min-h-12 text-sm leading-6 text-slate-600">
              Flexible cleaning shifts across ReadyNest service locations.
            </p>
            <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
              <Link to="/parttime">
                View Part-Time Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </main>
);

export default CareersPage;
