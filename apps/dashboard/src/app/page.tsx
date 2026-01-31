"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/projects');
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-background-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <span className="material-symbols-outlined text-3xl">movie_edit</span>
        </div>
        <p className="text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">
          Loading <span>Frame</span><span className="text-primary">Forge</span> Studio...
        </p>
      </div>
    </div>
  );
}
