import React, { useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';

export const LogsConsole: React.FC = () => {
    const { logs } = useProject();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="flex-1 bg-[#1e1e1e] text-slate-300 font-mono text-xs overflow-auto p-4">
            <div className="space-y-1">
                {logs.length === 0 && (
                    <div className="text-slate-500 italic">No logs received yet...</div>
                )}
                {logs.map((log, index) => (
                    <div key={index} className="flex gap-3 hover:bg-white/5 p-1 rounded">
                        <span className="text-slate-500 shrink-0 select-none">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex gap-2">
                            {log.level === 'info' && <span className="text-blue-400 font-bold shrink-0">[INFO]</span>}
                            {log.level === 'success' && <span className="text-emerald-400 font-bold shrink-0">[OK]</span>}
                            {log.level === 'error' && <span className="text-rose-400 font-bold shrink-0">[ERR]</span>}

                            <span className={log.level === 'error' ? 'text-rose-300' : 'text-slate-300'}>
                                {log.project_id && <span className="text-amber-500 mr-2">[{log.project_id}]</span>}
                                {log.message}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
