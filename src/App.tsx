import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from './components/ConfirmDialog';
import ControlPanel from './components/ControlPanel';
import ConstructionMode from './components/ConstructionMode';
import {
  FoundationRiskBadge,
  FoundationRiskLegend,
} from './components/FoundationReview';
import KnowledgeCenter from './components/KnowledgeCenter';
import SafetyClearanceDiagram from './components/SafetyClearanceDiagram';
import Stage3D from './components/Stage3D';
import { MasonryEngine } from './engine/MasonryEngine';
import type { MasonryInput } from './types';
import { DEFAULT_MASONRY_INPUT } from './utils/defaultInput';
import { buildFoundationAdvisory } from './utils/foundationAdvisory';
import {
  buildProjectFile,
  deleteStoredProjectSnapshot,
  parseProjectFile,
  readStoredProject,
  readStoredProjectSnapshots,
  type StoredFirepitProjectSnapshot,
  writeStoredProject,
  writeStoredProjectSnapshot,
} from './utils/projectFile';

const engine = new MasonryEngine();
const PROJECT_STORAGE_KEY = 'firepit-parametric-masonry-designer-project';
const PROJECT_SNAPSHOTS_STORAGE_KEY =
  'firepit-parametric-masonry-designer-project-snapshots';
const DEFAULT_PROJECT_NAME = 'Untitled Firepit';

type ProjectStatus = {
  label: string;
  timestamp: string | null;
};

type PendingSnapshotAction = {
  type: 'overwrite' | 'delete';
  snapshot: StoredFirepitProjectSnapshot;
} | null;

function slugifyProjectName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'firepit-project';
}

function roundUpToHundredth(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function formatProjectTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return 'time unavailable';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'time unavailable';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function findNoCutDiameterIn(
  input: MasonryInput,
  predicate: (nextOutput: ReturnType<typeof engine.calculateDesign>) => boolean,
): number {
  const start = Math.max(18, input.innerDiameterIn);
  const maxDiameterIn = 180;

  // Coarse search first to quickly bracket a passing diameter.
  let coarseCandidate: number | undefined;
  for (
    let diameterIn = start;
    diameterIn <= maxDiameterIn;
    diameterIn += 0.25
  ) {
    const candidateOutput = engine.calculateDesign({
      ...input,
      innerDiameterIn: diameterIn,
    });
    if (predicate(candidateOutput)) {
      coarseCandidate = diameterIn;
      break;
    }
  }

  if (coarseCandidate === undefined) {
    return maxDiameterIn;
  }

  // Refine within the previous coarse bucket for stable UX button values.
  const refineStart = Math.max(start, coarseCandidate - 0.25);
  for (
    let diameterIn = refineStart;
    diameterIn <= coarseCandidate;
    diameterIn += 0.01
  ) {
    const candidateOutput = engine.calculateDesign({
      ...input,
      innerDiameterIn: diameterIn,
    });
    if (predicate(candidateOutput)) {
      return roundUpToHundredth(diameterIn);
    }
  }

  return roundUpToHundredth(coarseCandidate);
}

type ViewMode = '3d' | 'construction';
type SiteView = 'designer' | 'guide' | 'tips' | 'research';

export default function App() {
  const initialProject = useMemo(
    () => readStoredProject(PROJECT_STORAGE_KEY, DEFAULT_MASONRY_INPUT),
    [],
  );
  const [input, setInput] = useState<MasonryInput>(
    () => initialProject?.input ?? DEFAULT_MASONRY_INPUT,
  );
  const [projectName, setProjectName] = useState<string>(
    () => initialProject?.projectName ?? DEFAULT_PROJECT_NAME,
  );
  const [view, setView] = useState<ViewMode>('3d');
  const [siteView, setSiteView] = useState<SiteView>('designer');
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(
    initialProject
      ? {
          label: 'Restored autosave',
          timestamp: initialProject.savedAt,
        }
      : null,
  );
  const [snapshots, setSnapshots] = useState<StoredFirepitProjectSnapshot[]>(
    () => readStoredProjectSnapshots(PROJECT_SNAPSHOTS_STORAGE_KEY),
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [pendingSnapshotAction, setPendingSnapshotAction] =
    useState<PendingSnapshotAction>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedAutosave = useRef(false);

  useEffect(() => {
    if (initialProject) {
      setProjectNotice(
        `Restored autosaved browser project${initialProject.projectName ? `: ${initialProject.projectName}` : '.'}`,
      );
    }
  }, [initialProject]);

  useEffect(() => {
    writeStoredProject(PROJECT_STORAGE_KEY, input, projectName);
    if (!hasInitializedAutosave.current) {
      hasInitializedAutosave.current = true;
      return;
    }

    setProjectStatus({
      label: 'Autosaved',
      timestamp: new Date().toISOString(),
    });
  }, [input, projectName]);

  const handleExportProject = () => {
    const projectFile = buildProjectFile(input, projectName);
    const blob = new Blob([JSON.stringify(projectFile, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    const fileNameBase = slugifyProjectName(projectName);

    link.href = url;
    link.download = `${fileNameBase}-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setProjectNotice(`Downloaded project JSON for ${projectName}.`);
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const refreshSnapshots = () => {
    const nextSnapshots = readStoredProjectSnapshots(
      PROJECT_SNAPSHOTS_STORAGE_KEY,
    );
    setSnapshots(nextSnapshots);
    if (
      selectedSnapshotId &&
      !nextSnapshots.some((snapshot) => snapshot.id === selectedSnapshotId)
    ) {
      setSelectedSnapshotId(nextSnapshots[0]?.id ?? '');
    }
    if (!selectedSnapshotId && nextSnapshots[0]?.id) {
      setSelectedSnapshotId(nextSnapshots[0].id);
    }
  };

  const handleSaveSnapshot = () => {
    const requestedName = window.prompt(
      'Save snapshot as',
      projectName || DEFAULT_PROJECT_NAME,
    );

    if (requestedName === null) {
      return;
    }

    const trimmedName = requestedName.trim() || DEFAULT_PROJECT_NAME;
    const snapshot = writeStoredProjectSnapshot(
      PROJECT_SNAPSHOTS_STORAGE_KEY,
      input,
      trimmedName,
    );

    setSnapshots(readStoredProjectSnapshots(PROJECT_SNAPSHOTS_STORAGE_KEY));
    setSelectedSnapshotId(snapshot.id);
    setProjectNotice(`Saved browser snapshot: ${trimmedName}.`);
    setProjectStatus({
      label: 'Saved snapshot',
      timestamp: snapshot.savedAt,
    });
  };

  const handleLoadSnapshot = () => {
    const snapshot = snapshots.find(
      (candidate) => candidate.id === selectedSnapshotId,
    );

    if (!snapshot) {
      return;
    }

    setInput(snapshot.input);
    setProjectName(snapshot.projectName ?? DEFAULT_PROJECT_NAME);
    setSiteView('designer');
    setView('3d');
    setProjectNotice(`Loaded browser snapshot: ${snapshot.projectName}.`);
    setProjectStatus({
      label: 'Loaded snapshot',
      timestamp: snapshot.savedAt,
    });
  };

  const handleOverwriteSnapshot = () => {
    const snapshot = snapshots.find(
      (candidate) => candidate.id === selectedSnapshotId,
    );

    if (!snapshot) {
      return;
    }

    setPendingSnapshotAction({
      type: 'overwrite',
      snapshot,
    });
  };

  const handleDeleteSnapshot = () => {
    const snapshot = snapshots.find(
      (candidate) => candidate.id === selectedSnapshotId,
    );

    if (!snapshot) {
      return;
    }

    setPendingSnapshotAction({
      type: 'delete',
      snapshot,
    });
  };

  const handleCancelSnapshotAction = () => {
    setPendingSnapshotAction(null);
  };

  const handleConfirmSnapshotAction = () => {
    if (!pendingSnapshotAction) {
      return;
    }

    if (pendingSnapshotAction.type === 'overwrite') {
      const nextSnapshot = writeStoredProjectSnapshot(
        PROJECT_SNAPSHOTS_STORAGE_KEY,
        input,
        projectName ||
          pendingSnapshotAction.snapshot.projectName ||
          DEFAULT_PROJECT_NAME,
        pendingSnapshotAction.snapshot.id,
      );

      refreshSnapshots();
      setSelectedSnapshotId(nextSnapshot.id);
      setProjectNotice(
        `Updated browser snapshot: ${nextSnapshot.projectName}.`,
      );
      setProjectStatus({
        label: 'Updated snapshot',
        timestamp: nextSnapshot.savedAt,
      });
    } else {
      deleteStoredProjectSnapshot(
        PROJECT_SNAPSHOTS_STORAGE_KEY,
        pendingSnapshotAction.snapshot.id,
      );
      refreshSnapshots();
      setProjectNotice(
        `Deleted browser snapshot: ${pendingSnapshotAction.snapshot.projectName}.`,
      );
    }

    setPendingSnapshotAction(null);
  };

  const handleImportProject = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsedProject = parseProjectFile(content, DEFAULT_MASONRY_INPUT);
      setInput(parsedProject.input);
      setProjectName(
        parsedProject.projectName ??
          (file.name.replace(/\.[^.]+$/, '') || DEFAULT_PROJECT_NAME),
      );
      setSiteView('designer');
      setView('3d');
      setProjectNotice(`Imported project from ${file.name}.`);
      setProjectStatus({
        label: 'Imported project',
        timestamp: parsedProject.savedAt ?? new Date().toISOString(),
      });
    } catch (error) {
      setProjectNotice(
        error instanceof Error
          ? `Import failed: ${error.message}`
          : 'Import failed: unsupported project file.',
      );
    } finally {
      event.target.value = '';
    }
  };

  const handleResetProject = () => {
    setInput(DEFAULT_MASONRY_INPUT);
    setProjectName(DEFAULT_PROJECT_NAME);
    setSiteView('designer');
    setView('3d');
    setProjectNotice('Started a new project from the default baseline.');
    setProjectStatus({
      label: 'Started new project',
      timestamp: new Date().toISOString(),
    });
  };

  useEffect(() => {
    if (!selectedSnapshotId && snapshots[0]?.id) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [selectedSnapshotId, snapshots]);

  const output = useMemo(() => engine.calculateDesign(input), [input]);
  const foundationAdvisory = useMemo(
    () => buildFoundationAdvisory(input, output),
    [input, output],
  );
  const noCutGuidance = useMemo(() => {
    if (output.planShape !== 'circular') {
      return undefined;
    }
    const wallMinimumNoCutDiameterIn = findNoCutDiameterIn(
      input,
      (nextOutput) => !nextOutput.cutPlan.requiresCutting,
    );
    const capMinimumNoCutDiameterIn = findNoCutDiameterIn(
      input,
      (nextOutput) => !nextOutput.capstone.requiresTaperCutting,
    );
    const capRequiresCutting = output.capstone.requiresTaperCutting;
    const bothMinimumNoCutDiameterIn = roundUpToHundredth(
      Math.max(wallMinimumNoCutDiameterIn, capMinimumNoCutDiameterIn),
    );

    return {
      wall: {
        requiresCutting: output.cutPlan.requiresCutting,
        minimumNoCutDiameterIn: wallMinimumNoCutDiameterIn,
      },
      cap: {
        requiresCutting: capRequiresCutting,
        minimumNoCutDiameterIn: capMinimumNoCutDiameterIn,
      },
      bothMinimumNoCutDiameterIn,
    };
  }, [input, output]);

  const siteTabs: Array<{ value: SiteView; label: string }> = [
    { value: 'designer', label: 'Designer' },
    { value: 'guide', label: 'Instructions' },
    { value: 'tips', label: 'Tips' },
    { value: 'research', label: 'Field Notes' },
  ];

  return (
    <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10'>
      <ConfirmDialog
        open={pendingSnapshotAction !== null}
        title={
          pendingSnapshotAction?.type === 'overwrite'
            ? 'Overwrite Snapshot'
            : 'Delete Snapshot'
        }
        message={
          pendingSnapshotAction?.type === 'overwrite'
            ? `Replace "${pendingSnapshotAction.snapshot.projectName ?? DEFAULT_PROJECT_NAME}" with the current project state?`
            : `Delete "${pendingSnapshotAction?.snapshot.projectName ?? DEFAULT_PROJECT_NAME}"? This cannot be undone.`
        }
        confirmLabel={
          pendingSnapshotAction?.type === 'overwrite' ? 'Overwrite' : 'Delete'
        }
        tone={pendingSnapshotAction?.type === 'delete' ? 'danger' : 'default'}
        onConfirm={handleConfirmSnapshotAction}
        onCancel={handleCancelSnapshotAction}
      />

      <header className='mb-5 card-rise rounded-2xl border border-amber-900/20 bg-amber-100/70 p-5 shadow-lg backdrop-blur'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/75'>
              Fire Pit Design Studio
            </p>
            <h1 className='mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl'>
              Parametric Masonry Designer
            </h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 sm:text-base'>
              Plan masonry fire pits with real unit dimensions, venting rules,
              safety checks, material estimates, and build-focused reference
              guidance.
            </p>
          </div>

          <nav className='flex flex-wrap gap-2' aria-label='Site sections'>
            {siteTabs.map((tab) => {
              const selected = siteView === tab.value;

              return (
                <button
                  key={tab.value}
                  type='button'
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-amber-900 text-amber-50'
                      : 'bg-white/70 text-amber-900 hover:bg-white'
                  }`}
                  onClick={() => setSiteView(tab.value)}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <details className='group mt-4 rounded-2xl border border-amber-900/20 bg-white/35'>
          <summary className='cursor-pointer list-none px-4 py-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
                  Project Workspace
                </p>
                <p className='mt-1 text-sm text-amber-900/80'>
                  Name, import/export, autosave, and snapshot controls.
                </p>
              </div>
              <span className='rounded-full border border-amber-900/20 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900 transition-transform group-open:rotate-180'>
                Expand
              </span>
            </div>
          </summary>

          <div className='border-t border-amber-900/15 px-4 pb-4 pt-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <label className='flex min-w-[240px] flex-1 flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
                  Project Name
                </span>
                <input
                  className='rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-medium text-amber-950'
                  aria-label='Project Name'
                  title='Project Name'
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </label>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-white'
                onClick={handleExportProject}
              >
                Save Project JSON
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-white'
                onClick={handleImportButtonClick}
              >
                Import Project
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-amber-50/80 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-50'
                onClick={handleResetProject}
              >
                New Project
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-950'
                onClick={handleSaveSnapshot}
              >
                Save As Snapshot
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='application/json,.json'
                className='hidden'
                aria-label='Import project JSON'
                onChange={handleImportProject}
              />
              <p className='text-sm text-amber-900/75'>
                Projects autosave in this browser and can also be exported or
                imported as JSON.
              </p>
            </div>

            <div className='mt-3 flex flex-wrap items-end gap-2'>
              <label className='flex min-w-[260px] flex-1 flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
                  Browser Snapshots
                </span>
                <select
                  className='rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm text-amber-950'
                  aria-label='Browser Snapshots'
                  title='Browser Snapshots'
                  value={selectedSnapshotId}
                  onChange={(event) =>
                    setSelectedSnapshotId(event.target.value)
                  }
                >
                  <option value=''>No snapshot selected</option>
                  {snapshots.map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {snapshot.projectName ?? DEFAULT_PROJECT_NAME} -{' '}
                      {formatProjectTimestamp(snapshot.savedAt)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
                onClick={handleLoadSnapshot}
                disabled={!selectedSnapshotId}
              >
                Load Snapshot
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/20 bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-50'
                onClick={handleOverwriteSnapshot}
                disabled={!selectedSnapshotId}
              >
                Overwrite Snapshot
              </button>
              <button
                type='button'
                className='rounded-full border border-red-800/20 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
                onClick={handleDeleteSnapshot}
                disabled={!selectedSnapshotId}
              >
                Delete Snapshot
              </button>
            </div>

            {projectStatus && (
              <div className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 px-3 py-2 text-sm text-amber-950/85'>
                <strong>{projectStatus.label}</strong>: {projectName} at{' '}
                {formatProjectTimestamp(projectStatus.timestamp)}.
              </div>
            )}

            {projectNotice && (
              <div className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 px-3 py-2 text-sm text-amber-950/85'>
                {projectNotice}
              </div>
            )}
          </div>
        </details>
      </header>

      {siteView === 'designer' ? (
        <div className='grid gap-4 lg:grid-cols-[360px_1fr]'>
          <ControlPanel
            input={input}
            setInput={setInput}
            noCutGuidance={noCutGuidance}
          />

          <section className='space-y-4'>
            <div className='card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-3'>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Units/Course
                </p>
                <p className='text-2xl font-bold'>
                  {output.unitsPerCourseRounded}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Total Units
                </p>
                <p className='text-2xl font-bold'>{output.totalUnits}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Plan Shape
                </p>
                <p className='text-2xl font-bold'>{output.planShape}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Cap Units
                </p>
                <p className='text-2xl font-bold'>
                  {output.capstone.capUnitsPerCourseRounded}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Liner
                </p>
                <p className='text-lg font-bold'>
                  {output.linerSpec.type === 'none'
                    ? 'None'
                    : output.linerSpec.type === 'fire-brick'
                      ? 'Fire Brick'
                      : 'Steel Ring'}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Stone Base (yd3)
                </p>
                <p className='text-2xl font-bold'>
                  {output.foundation.stoneVolumeCubicYards.toFixed(2)}
                </p>
                <p className='mt-1'>
                  <FoundationRiskBadge risk={foundationAdvisory.risk} />
                </p>
              </div>
            </div>

            <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Course Strategy
                </p>
                <span className='rounded-full border border-amber-900/20 bg-white px-3 py-1 text-xs font-semibold text-amber-950'>
                  {output.courseStrategy.strategy}
                </span>
              </div>

              <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
                <span className='rounded-xl border border-amber-900/20 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950'>
                  <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#7d3512] align-middle' />
                  Standard course units
                </span>
                {output.courseStrategy.strategy === 'shim-spacer' && (
                  <>
                    <span className='rounded-xl border border-indigo-900/20 bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-950'>
                      <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#6f58b5] align-middle' />
                      Shim Spacer Course
                    </span>
                    <span className='rounded-xl border border-indigo-900/20 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-950'>
                      <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#6f58b5] align-middle' />
                      Shim Units: {output.courseStrategy.shimUnitCount}
                    </span>
                  </>
                )}
                {output.courseStrategy.strategy === 'vented-accent' && (
                  <>
                    <span className='rounded-xl border border-amber-900/20 bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-950'>
                      <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#8a5a13] align-middle' />
                      Vented Accent Course
                    </span>
                    <span className='rounded-xl border border-amber-900/20 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950'>
                      <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#8a5a13] align-middle' />
                      Accent Indexes:{' '}
                      {output.courseStrategy.accentCourseIndexes
                        .map((index) => `C${index + 1}`)
                        .join(', ') || 'None'}
                    </span>
                  </>
                )}
                <span className='rounded-xl border border-red-900/20 bg-red-100 px-3 py-2 text-xs font-semibold text-red-950'>
                  <span className='mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#c13a1f] align-middle' />
                  Vent opening marker
                </span>
              </div>
            </div>

            <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
              <FoundationRiskLegend />
            </div>

            <div className='card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-5'>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Purchased Units
                </p>
                <p className='text-xl font-bold'>
                  {output.logistics.purchasedUnits}
                </p>
                <p className='text-xs text-amber-900/70'>
                  Includes {output.logistics.wasteFactorPct}% waste
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Brick Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedBrickWeightLb)} lb
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Stone Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedStoneWeightLb)} lb
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Mortar Volume
                </p>
                <p className='text-xl font-bold'>
                  {output.logistics.estimatedMortarVolumeCubicFeet.toFixed(1)}{' '}
                  ft3
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Cap Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedCapWeightLb)} lb
                </p>
                <p className='text-xs text-amber-900/70'>
                  Purchased caps: {output.logistics.purchasedCapUnits}
                </p>
              </div>
            </div>

            {output.warnings.length > 0 && (
              <div className='card-rise rounded-2xl border border-red-800/25 bg-red-50 p-4 text-red-900 shadow-lg'>
                {output.warnings.map((warning) => (
                  <p key={warning.code} className='text-sm font-medium'>
                    {warning.message}
                    {warning.actualValue !== undefined && (
                      <>
                        {' '}
                        Entered: {warning.actualValue.toFixed(1)}
                        {warning.code === 'clearance-too-low'
                          ? ' ft'
                          : warning.code === 'gas-line-near-vent'
                            ? ' deg'
                            : ''}
                        .
                      </>
                    )}
                  </p>
                ))}
              </div>
            )}

            <div className='flex gap-2'>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${view === '3d' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
                onClick={() => setView('3d')}
              >
                3D Stage
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${view === 'construction' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
                onClick={() => setView('construction')}
              >
                Construction Mode
              </button>
            </div>

            {view === '3d' ? (
              <Stage3D output={output} />
            ) : (
              <ConstructionMode input={input} output={output} />
            )}

            <SafetyClearanceDiagram input={input} output={output} />

            <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 text-sm shadow-lg'>
              <p>
                Unit basis:{' '}
                <strong>
                  {output.resolvedUnit.name}{' '}
                  {output.resolvedUnit.lengthIn.toFixed(3)}
                  in x {output.resolvedUnit.widthIn.toFixed(3)} in x{' '}
                  {output.resolvedUnit.heightIn.toFixed(3)} in
                </strong>
              </p>
              <p>
                Plan footprint:{' '}
                <strong>
                  {output.innerSpanWidthIn.toFixed(2)} in x{' '}
                  {output.innerSpanDepthIn.toFixed(2)} in inner
                </strong>
              </p>
              <p>
                Vent rule:{' '}
                <strong>
                  {output.ventSpec.placement === 'base'
                    ? 'Base Venting'
                    : 'Upper Venting'}
                </strong>{' '}
                ({output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in total open
                area, {output.ventSpec.layout})
              </p>
              <p>
                Vent brick indexes:{' '}
                <strong>{output.ventSpec.ventBrickIndexes.join(', ')}</strong>
              </p>
              <p>
                Liner system: <strong>{output.linerSpec.description}</strong>
              </p>
              {input.fuelType !== 'wood' &&
                output.ventSpec.gasLineEntryAngleDeg !== undefined && (
                  <p>
                    Gas line entry:{' '}
                    <strong>
                      {output.ventSpec.gasLineEntryAngleDeg.toFixed(0)} deg at
                      brick {output.ventSpec.gasLineEntryBrickIndex}
                    </strong>
                    {output.ventSpec.gasLineAutoAdjusted &&
                      ' (auto-shifted off vent gap)'}
                  </p>
                )}
              <p>
                Foundation footprint:{' '}
                <strong>
                  {output.foundation.footprintWidthIn.toFixed(2)} in x{' '}
                  {output.foundation.footprintDepthIn.toFixed(2)} in
                </strong>{' '}
                with 8 in angular stone depth.
              </p>
              <p>
                Foundation advisory:{' '}
                <strong>{foundationAdvisory.heading}</strong> (
                {foundationAdvisory.risk} risk).
              </p>
              <p>
                Site context:{' '}
                <strong>
                  {input.soilType ?? 'unknown'} soil,{' '}
                  {input.drainageCondition ?? 'unknown'} drainage,{' '}
                  {input.frostClimate
                    ? 'freeze-thaw climate'
                    : 'minimal frost risk'}
                </strong>
              </p>
              {foundationAdvisory.checks.map((check) => (
                <p key={check}>- {check}</p>
              ))}
              <p>
                Capstone span:{' '}
                <strong>
                  {output.capstone.capOuterWidthIn.toFixed(2)} in x{' '}
                  {output.capstone.capOuterDepthIn.toFixed(2)} in
                </strong>{' '}
                ({input.capstoneOverhangIn.toFixed(2)} in overhang each side).
              </p>
              <p>
                Capstone type: <strong>{output.resolvedCapUnit.name}</strong> (
                {input.capPlacementMode})
              </p>
              <p>
                Cut guidance:{' '}
                <strong>
                  {output.cutPlan.requiresCutting
                    ? `Taper each brick by ${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side)`
                    : 'No taper cuts required at this diameter'}
                </strong>
              </p>
            </div>
          </section>
        </div>
      ) : (
        <KnowledgeCenter view={siteView} />
      )}
    </main>
  );
}
