"use client";
import React from 'react';
import { Sidebar } from '../presentation/components/Sidebar';
import { Header } from '../presentation/components/Header';
import { ProjectList } from '../presentation/components/ProjectList';
import { ProjectDetail } from '../presentation/components/ProjectDetail';
import { SettingsView } from '../presentation/components/SettingsView';
import { ProjectProvider, useProject } from '../presentation/context/ProjectContext';

function DashboardContent() {
  const { projects, selectedProject, setSelectedProject } = useProject();
  const [currentNav, setCurrentNav] = React.useState<'projects' | 'jobs' | 'assets' | 'settings'>('projects');

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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-slate-900 dark:text-slate-100">All</span>
                  <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-900 dark:text-slate-100">All Subreddits</span>
                  <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-primary transition-colors">Only Errors</span>
                  <div className="relative">
                    <input checked={false} className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </label>
              </div>
            </section>

            <div className="flex-1 flex overflow-hidden">
              <ProjectList
                projects={projects}
                selectedId={selectedProject?.id}
                onSelect={(id) => setSelectedProject(projects.find(p => p.id === id))}
              />
              <ProjectDetail project={selectedProject} />
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
