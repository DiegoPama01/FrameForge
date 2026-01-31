"use client";
import React from 'react';
import { WorkflowEditorView } from '../../presentation/components/WorkflowEditorView';
import { JobsView } from '../../presentation/components/JobsView';
import { LogsConsole } from '../../presentation/components/LogsConsole';
import ResultsPage from '../results/page';
import ProjectsPage from '../projects/page';

type TabId = 'workflows' | 'jobs' | 'projects' | 'results' | 'logs';

const TABS: { id: TabId; label: string }[] = [
    { id: 'workflows', label: 'Workflows' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'projects', label: 'Projects' },
    { id: 'results', label: 'Results' },
    { id: 'logs', label: 'Logs' },
];

export default function DashboardPage() {
    const [activeTab, setActiveTab] = React.useState<TabId>('workflows');

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark px-8">
                <div className="max-w-6xl mx-auto flex items-center gap-2 py-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${activeTab === tab.id
                                ? 'bg-primary/10 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === 'workflows' && <WorkflowEditorView />}
                {activeTab === 'jobs' && <JobsView />}
                {activeTab === 'projects' && <ProjectsPage />}
                {activeTab === 'results' && <ResultsPage />}
                {activeTab === 'logs' && <LogsConsole />}
            </div>
        </div>
    );
}
