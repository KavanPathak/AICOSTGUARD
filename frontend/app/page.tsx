'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('acg_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-slate-950">
      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      <span className="mt-4 text-sm text-muted-foreground">Redirecting...</span>
    </div>
  );
}
