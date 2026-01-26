"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from '../presentation/components/Sidebar';
import { Header } from '../presentation/components/Header';
import { ProjectList } from '../presentation/components/ProjectList';
import { ProjectDetail } from '../presentation/components/ProjectDetail';
import { SettingsView } from '../presentation/components/SettingsView';
import { LogsConsole } from '../presentation/components/LogsConsole';
import { ProjectProvider, useProject } from '../presentation/context/ProjectContext';

function DashboardContent() {
  const { projects, selectedProject, setSelectedProject, view } = useProject();
  const [currentNav, setCurrentNav] = useState<'projects' | 'jobs' | 'assets' | 'settings'>('projects');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Refs for click-away
  const statusRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived data for filters
  const categories = useMemo(() => {
    const cats = new Set(projects.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [projects]);

  const statuses = useMemo(() => {
    const stats = new Set(projects.map(p => p.status).filter(Boolean));
    return ['All', ...Array.from(stats)].sort();
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchError = !onlyErrors || p.status === 'Error';
      return matchStatus && matchCategory && matchError;
    });
  }, [projects, statusFilter, categoryFilter, onlyErrors]);

  return (
    <div className="flex h-screen w-full">
      <Sidebar currentNav={currentNav} onNavChange={setCurrentNav} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        {currentNav === 'projects' && (
          <>
            {/* Filter Section */}
            <section className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative" ref={statusRef}>
                  <div
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-slate-500">Status:</span>
                    <span className="text-slate-900 dark:text-slate-100">{statusFilter}</span>
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </div>
                  {isStatusOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20">
                      {statuses.map(s => (
                        <div
                          key={s}
                          onClick={() => {
                            setStatusFilter(s);
                            setIsStatusOpen(false);
                          }}
                          className={`px-4 py-2 text-xs hover:bg-primary/10 cursor-pointer transition-colors ${statusFilter === s ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={categoryRef}>
                  <div
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-slate-500">Category:</span>
                    <span className="text-slate-900 dark:text-slate-100">{categoryFilter === 'All' ? 'All Subreddits' : `r/${categoryFilter}`}</span>
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </div>
                  {isCategoryOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 max-h-60 overflow-auto">
                      {categories.map(c => (
                        <div
                          key={c}
                          onClick={() => {
                            setCategoryFilter(c || 'All');
                            setIsCategoryOpen(false);
                          }}
                          className={`px-4 py-2 text-xs hover:bg-primary/10 cursor-pointer transition-colors ${categoryFilter === c ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          {c === 'All' ? 'All Subreddits' : `r/${c}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-primary transition-colors">Only Errors</span>
                  <div className="relative">
                    <input
                      checked={onlyErrors}
                      onChange={(e) => setOnlyErrors(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </label>
              </div>
            </section>

            <div className="flex-1 flex overflow-hidden">
              {view === 'logs' ? (
                <LogsConsole />
              ) : (
                <>
                  <ProjectList
                    projects={filteredProjects}
                    selectedId={selectedProject?.id}
                    onSelect={(id) => setSelectedProject(projects.find(p => p.id === id))}
                  />
                  <ProjectDetail project={selectedProject} />
                </>
              )}
            </div>
          </>
        )}

        {currentNav === 'settings' && <SettingsView />}
        {(currentNav === 'jobs' || currentNav === 'assets') && (
          <div className="p-8 text-slate-500 italic">This view is coming soon...</div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ProjectProvider>
      <DashboardContent />
    </ProjectProvider>
  );
}
