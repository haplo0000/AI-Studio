import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityLog } from './components/ActivityLog';
import { BlacksmithWorkspace } from './components/BlacksmithWorkspace';
import { CurrentWorkshopSelector } from './components/CurrentWorkshopSelector';
import { ServiceDiagnosticsPanel } from './components/ServiceDiagnosticsPanel';
import { ImageStudioPage } from './components/image-studio/ImageStudioPage';
import { LaunchersPanel } from './components/LaunchersPanel';
import { ServiceChip } from './components/ServiceChip';
import { StudioErrorDialog } from './components/StudioErrorDialog';
import { SettingsPanel } from './components/SettingsPanel';
import { WorkbenchDashboard } from './components/WorkbenchDashboard';
import { StartupSplash } from './components/StartupSplash';
import {
  mergeWorkstationServices,
  WorkstationStartupPanel,
} from './components/WorkstationStartupPanel';
import type {
  BootstrapData,
  LogEntry,
  ServiceHealth,
  ServiceDiagnostic,
  StudioActionResult,
  WorkbenchView,
  WorkstationStatus,
  WorkshopEntry,
} from './types/studio';
import { waitForAiStudio } from './lib/aiStudioBridge';

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [serviceDiagnostics, setServiceDiagnostics] = useState<ServiceDiagnostic[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopEntry[]>([]);
  const [currentWorkshopId, setCurrentWorkshopId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkbenchView>('blacksmith');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workstationStatus, setWorkstationStatus] = useState<WorkstationStatus | null>(null);
  const [workstationBusy, setWorkstationBusy] = useState(false);
  const [prepareComplete, setPrepareComplete] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [councilErrorDialog, setCouncilErrorDialog] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const showCouncilFailure = useCallback(
    (title: string, message: string, detail?: string) => {
      setCouncilErrorDialog({ title, message, detail });
      setActionError(null);
    },
    [],
  );

  const refreshLogs = useCallback(async () => {
    if (!window.aiStudio) return;
    const next = await window.aiStudio.getLogs();
    setLogs(next);
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    if (!window.aiStudio?.getServiceDiagnostics) return;
    const next = await window.aiStudio.getServiceDiagnostics();
    setServiceDiagnostics(next);
  }, []);

  const refreshHealth = useCallback(async () => {
    if (!window.aiStudio) return;
    const next = await window.aiStudio.refreshHealth();
    setServices(next);
    await refreshDiagnostics();
    await refreshLogs();
  }, [refreshLogs, refreshDiagnostics]);

  const applyCouncilResult = useCallback(
    async (result: StudioActionResult) => {
      if (!result.ok) {
        showCouncilFailure('Could not open Council OS', result.message, result.detail);
        return false;
      }
      setActionMessage(result.message);
      await refreshHealth();
      return true;
    },
    [refreshHealth, showCouncilFailure],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const api = await waitForAiStudio();
        unsubscribe = api.onWorkstationStatus((status) => {
          if (cancelled) return;
          setWorkstationStatus(status);
          setServices((prev) => mergeWorkstationServices(prev, status));
        });

        const data = await api.getBootstrap();
        if (cancelled) return;
        setBootstrap(data);
        setServices(data.services);
        setLogs(data.logs);
        setWorkshops(data.workshops);
        setCurrentWorkshopId(data.currentWorkshopId);
        setLoadError(null);

        void api.prepareWorkstation().then((status) => {
          if (!cancelled) {
            setWorkstationStatus(status);
            setServices((prev) => mergeWorkstationServices(prev, status));
            setPrepareComplete(true);
          }
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load AI Studio');
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!bootstrap || !prepareComplete || splashDismissed) return;
    const delay = workstationStatus?.workbenchReady ? 900 : 400;
    const fadeTimer = window.setTimeout(() => setSplashFading(true), delay);
    const dismissTimer = window.setTimeout(() => setSplashDismissed(true), delay + 500);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [bootstrap, prepareComplete, splashDismissed, workstationStatus?.workbenchReady]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshHealth();
    }, 30000);
    return () => window.clearInterval(id);
  }, [refreshHealth]);

  const handleLaunch = async (moduleId: string) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.launchModule(moduleId);
      if (moduleId === 'council-os') {
        await applyCouncilResult(result);
      } else {
        setActionMessage(result.message);
        await refreshHealth();
      }
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
      if (action === 'open-council') {
        await applyCouncilResult(result);
      } else {
        setActionMessage(result.message);
        await refreshHealth();
      }
    } catch (err) {
      if (action === 'open-council') {
        const error = err as Error & { detail?: string };
        showCouncilFailure(
          'Could not open Council OS',
          error.message || 'Action failed',
          error.detail,
        );
      } else {
        setActionError(err instanceof Error ? err.message : 'Action failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    setActionError(null);
    try {
      await window.aiStudio.openUrl(url);
      await refreshHealth();
    } catch (err) {
      const error = err as Error & { detail?: string };
      if (error.detail) {
        showCouncilFailure(
          'Could not open Council OS',
          error.message || 'Could not open URL',
          error.detail,
        );
      } else {
        setActionError(error.message || 'Could not open URL');
      }
    }
  };

  const handleCurrentWorkshopChange = async (workshopId: string) => {
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.setCurrentWorkshop(workshopId);
      setCurrentWorkshopId(result.currentWorkshopId);
      setActionMessage(
        `Workshop context: ${workshops.find((w) => w.id === workshopId)?.name || workshopId}`,
      );
      await refreshLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not set current workshop');
    }
  };

  const handleOpenWorkshopFolder = async (workshopId: string) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.openWorkshopFolder(workshopId);
      setActionMessage(result.message);
      await refreshLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open folder');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenWorkshopInCursor = async (workshopId: string) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.openWorkshopInCursor(workshopId);
      setActionMessage(result.message);
      await refreshLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open in Cursor');
    } finally {
      setBusy(false);
    }
  };

  const handleToolClick = (
    toolId: string,
    kind: string,
    target?: string,
    placeholder?: boolean,
  ) => {
    if (placeholder) {
      setActionMessage(`${toolId} is not implemented yet.`);
      return;
    }

    setActionError(null);
    setActionMessage(null);

    if (kind === 'navigate' && target) {
      if (target === 'blacksmith') {
        setActiveView('blacksmith');
        return;
      }
      if (target === 'logs') {
        setActiveView('workbench');
        logPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      setActiveView(target as WorkbenchView);
      return;
    }

    if (kind === 'launch-module' && target) {
      void handleLaunch(target);
      return;
    }

    if (kind === 'launch-action' && target) {
      void handleAction(target);
    }
  };

  const handleSendToBlacksmith = async (goal: string) => {
    setActionError(null);
    try {
      const session = await window.aiStudio.blacksmithCreateSession(currentWorkshopId, 'forge', goal);
      await window.aiStudio.blacksmithSendMessage(session.id, goal);
      setActiveView('blacksmith');
      setActionMessage('Sent to Blacksmith — continue forging the idea.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Blacksmith handoff failed');
    }
  };

  const handleStartService = async (serviceId: string) => {
    setWorkstationBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.startService(serviceId);
      setActionMessage(result.message);
      await refreshHealth();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start service');
    } finally {
      setWorkstationBusy(false);
    }
  };

  const handleRestartComfyui = async () => {
    setWorkstationBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.restartComfyui();
      setActionMessage(result.message);
      await refreshHealth();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not restart ComfyUI');
    } finally {
      setWorkstationBusy(false);
    }
  };

  const handleRestartCouncil = async () => {
    setWorkstationBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.restartCouncil();
      await applyCouncilResult(result);
    } catch (err) {
      const error = err as Error & { detail?: string };
      showCouncilFailure(
        'Could not restart Council OS',
        error.message || 'Could not restart Council OS',
        error.detail,
      );
    } finally {
      setWorkstationBusy(false);
    }
  };

  const handleOpenCouncil = async () => {
    setWorkstationBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.openCouncil();
      await applyCouncilResult(result);
    } catch (err) {
      const error = err as Error & { detail?: string };
      showCouncilFailure(
        'Could not open Council OS',
        error.message || 'Could not open Council OS',
        error.detail,
      );
    } finally {
      setWorkstationBusy(false);
    }
  };

  const handleRestartService = async (serviceId: string) => {
    setWorkstationBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await window.aiStudio.restartService(serviceId);
      if (serviceId === 'council_os' && 'detail' in result) {
        await applyCouncilResult(result as StudioActionResult);
        return;
      }
      setActionMessage(result.message);
      await refreshHealth();
    } catch (err) {
      if (serviceId === 'council_os') {
        const error = err as Error & { detail?: string };
        showCouncilFailure(
          'Could not restart service',
          error.message || 'Restart failed',
          error.detail,
        );
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not restart service');
      }
    } finally {
      setWorkstationBusy(false);
    }
  };

  useEffect(() => {
    if (activeView === 'health' && bootstrap) {
      void refreshDiagnostics();
    }
  }, [activeView, bootstrap, refreshDiagnostics]);

  const comfyuiHealthy =
    (workstationStatus?.services.comfyui ?? services.find((s) => s.id === 'comfyui'))?.status ===
    'green';
  const ollamaHealthy = services.find((s) => s.id === 'ollama')?.status === 'green';
  const showActivityLog = activeView !== 'blacksmith' && activeView !== 'image-studio';

  const showSplash = !splashDismissed && !loadError;

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

  if (!bootstrap && !showSplash) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        Entering the forge…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {showSplash && <StartupSplash status={workstationStatus} fading={splashFading} />}

      {bootstrap && (
    <div className="h-full flex flex-col">
      <header className="shrink-0 border-b border-border-subtle bg-surface-raised/80 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-accent flex items-center justify-center text-sm">
            🔨
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight">AI Studio</h1>
            <p className="text-[11px] text-text-muted">Creative workbench · Forge before Council</p>
          </div>
        </div>

        <CurrentWorkshopSelector
          workshops={workshops}
          currentWorkshopId={currentWorkshopId}
          onChange={handleCurrentWorkshopChange}
        />

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {activeView === 'blacksmith' && (
            <button
              type="button"
              onClick={() => setActiveView('image-studio')}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
            >
              Image Studio
            </button>
          )}
          {activeView === 'image-studio' && (
            <button
              type="button"
              onClick={() => setActiveView('blacksmith')}
              className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10"
            >
              ← Blacksmith
            </button>
          )}
          {activeView !== 'blacksmith' && activeView !== 'image-studio' && (
            <button
              type="button"
              onClick={() => setActiveView('blacksmith')}
              className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10"
            >
              ← Blacksmith
            </button>
          )}
          {activeView === 'blacksmith' && (
            <button
              type="button"
              onClick={() => setActiveView('workbench')}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
            >
              Tools & Workshops
            </button>
          )}
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

      <WorkstationStartupPanel
        status={workstationStatus}
        busy={workstationBusy}
        onStartService={(id) => void handleStartService(id)}
        onRestartComfyui={() => void handleRestartComfyui()}
        onOpenCouncil={() => void handleOpenCouncil()}
        onRestartCouncil={() => void handleRestartCouncil()}
      />

      {(actionError || actionMessage) && (
        <div
          className={`shrink-0 px-4 py-2 text-xs border-b ${
            actionError
              ? 'bg-danger/10 border-danger/30 text-danger'
              : 'bg-success/10 border-success/30 text-success'
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {activeView === 'blacksmith' && (
            <BlacksmithWorkspace
              currentWorkshopId={currentWorkshopId}
              ollamaHealthy={ollamaHealthy}
              onNotify={(message, error) => {
                setActionMessage(message);
                setActionError(error ?? null);
              }}
            />
          )}
          {activeView === 'image-studio' && (
            <ImageStudioPage
              comfyuiHealthy={comfyuiHealthy}
              busy={busy}
              setBusy={setBusy}
              onNotify={(message, error) => {
                setActionMessage(message);
                setActionError(error ?? null);
              }}
              onSendToBlacksmith={handleSendToBlacksmith}
              onOpenAdvanced={() => void handleAction('open-comfyui')}
            />
          )}
          {activeView === 'workbench' && (
            <WorkbenchDashboard
              workshops={workshops}
              currentWorkshopId={currentWorkshopId}
              services={services}
              busy={busy}
              onToolClick={handleToolClick}
              onSelectWorkshop={handleCurrentWorkshopChange}
              onOpenWorkshopFolder={handleOpenWorkshopFolder}
              onOpenWorkshopInCursor={handleOpenWorkshopInCursor}
            />
          )}
          {activeView === 'settings' && (
            <div className="flex-1 flex flex-col min-h-0">
              <ViewBackBar label="Settings" onBack={() => setActiveView('blacksmith')} />
              <SettingsPanel
                settings={bootstrap.settings}
                runtimeNote={bootstrap.runtimeNote}
                workshops={workshops}
                currentWorkshopId={currentWorkshopId}
                onAction={handleAction}
              />
            </div>
          )}
          {activeView === 'health' && (
            <div className="flex-1 flex flex-col min-h-0">
              <ViewBackBar label="Service Diagnostics" onBack={() => setActiveView('blacksmith')} />
              <ServiceDiagnosticsPanel
                diagnostics={serviceDiagnostics}
                busy={workstationBusy}
                onRefresh={refreshHealth}
                onRestart={(id) => void handleRestartService(id)}
                onOpenUrl={handleOpenUrl}
              />
            </div>
          )}
          {activeView === 'launchers' && (
            <div className="flex-1 flex flex-col min-h-0">
              <ViewBackBar label="Launchers" onBack={() => setActiveView('blacksmith')} />
              <LaunchersPanel
                modules={bootstrap.modules}
                services={services}
                busy={busy}
                lastMessage={actionMessage}
                lastError={actionError}
                onLaunch={handleLaunch}
                onAction={handleAction}
              />
            </div>
          )}
        </div>

        {showActivityLog && (
          <div ref={logPanelRef} className="w-80 shrink-0 hidden lg:flex flex-col min-h-0">
            <ActivityLog logs={logs} error={null} onRefresh={refreshLogs} />
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-border-subtle px-4 py-2 text-xs text-text-muted flex justify-between">
        <span>Hub: C:\AI\AIStudio</span>
        <span>Phase 4 · Video MVP</span>
      </footer>

      {councilErrorDialog && (
        <StudioErrorDialog
          title={councilErrorDialog.title}
          message={councilErrorDialog.message}
          detail={councilErrorDialog.detail}
          onClose={() => setCouncilErrorDialog(null)}
        />
      )}
    </div>
      )}
    </div>
  );
}

function ViewBackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="shrink-0 px-6 py-3 border-b border-border-subtle flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
      >
        ← Home
      </button>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
