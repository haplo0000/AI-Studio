import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityLog } from './components/ActivityLog';
import { ModuleSurface } from './components/ModuleSurface';
import { NavRail } from './components/NavRail';
import { ServiceChip } from './components/ServiceChip';
import { SettingsPanel } from './components/SettingsPanel';
import type { BootstrapData, LogEntry, ModuleManifest, ServiceHealth } from './types/studio';

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeId, setActiveId] = useState('council-os');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshLogs = useCallback(async () => {
    if (!window.aiStudio) return;
    const next = await window.aiStudio.getLogs();
    setLogs(next);
  }, []);

  const refreshHealth = useCallback(async () => {
    if (!window.aiStudio) return;
    const next = await window.aiStudio.refreshHealth();
    setServices(next);
    await refreshLogs();
  }, [refreshLogs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.aiStudio) {
          throw new Error('AI Studio API unavailable. Run with Electron (npm run dev).');
        }
        const data = await window.aiStudio.getBootstrap();
        if (cancelled) return;
        setBootstrap(data);
        setServices(data.services);
        setLogs(data.logs);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load AI Studio');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshHealth();
    }, 30000);
    return () => window.clearInterval(id);
  }, [refreshHealth]);

  const activeModule = useMemo<ModuleManifest | null>(() => {
    if (activeId === 'settings') return null;
    return bootstrap?.modules.find((m) => m.id === activeId) ?? null;
  }, [activeId, bootstrap]);

  const handleLaunch = async (moduleId: string) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.launchModule(moduleId);
      setActionMessage(result.message);
      await refreshHealth();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Launch failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (action: string) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.launchAction(action);
      setActionMessage(result.message);
      await refreshHealth();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    setActionError(null);
    try {
      await window.aiStudio.openUrl(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open URL');
    }
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-lg p-6 rounded-xl bg-danger/10 border border-danger/30">
          <h1 className="text-lg font-bold text-danger mb-2">AI Studio failed to start</h1>
          <p className="text-sm text-text-secondary">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!bootstrap) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        Loading AI Studio…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 border-b border-border-subtle bg-surface-raised/80 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-sm">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight">AI Studio</h1>
            <p className="text-[11px] text-text-muted">Phase 2A · Read-only control plane</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {services.map((svc) => (
            <ServiceChip
              key={svc.id}
              label={svc.label}
              status={svc.status}
              message={svc.message}
              onClick={() => svc.url && handleOpenUrl(svc.url)}
            />
          ))}
          <button
            type="button"
            onClick={refreshHealth}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <NavRail
          modules={bootstrap.modules}
          activeId={activeId}
          onSelect={setActiveId}
        />

        {activeId === 'settings' ? (
          <SettingsPanel
            settings={bootstrap.settings}
            runtimeNote={bootstrap.runtimeNote}
            onAction={handleAction}
          />
        ) : (
          <ModuleSurface
            module={activeModule}
            services={services}
            busy={busy}
            lastMessage={actionMessage}
            lastError={actionError}
            onLaunch={handleLaunch}
            onAction={handleAction}
            onOpenUrl={handleOpenUrl}
          />
        )}

        <div className="w-80 shrink-0 hidden lg:flex flex-col min-h-0">
          <ActivityLog logs={logs} error={null} onRefresh={refreshLogs} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-border-subtle px-4 py-2 text-xs text-text-muted flex justify-between">
        <span>Hub: C:\AI\AIStudio</span>
        <span>{bootstrap.runtimeNote.split('.')[0]}</span>
      </footer>
    </div>
  );
}
