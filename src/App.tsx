import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from './components/ConfirmDialog';
import ControlPanel from './components/ControlPanel';
import { FoundationRiskBadge } from './components/FoundationReview';
import SafetyClearanceDiagram from './components/SafetyClearanceDiagram';
import ProjectInfoCard from './components/ProjectInfoCard';
import BillOfMaterials from './components/BillOfMaterials';
import RegionalCodeChecker from './components/RegionalCodeChecker';
import MaterialOptimizationSuggestions from './components/MaterialOptimizationSuggestions';
import ProjectComparisonPanel from './components/ProjectComparisonPanel';
import { MasonryEngine } from './engine/MasonryEngine';
import type { MasonryInput } from './types';
import { DEFAULT_MASONRY_INPUT } from './utils/defaultInput';
import { buildFoundationAdvisory } from './utils/foundationAdvisory';
import {
  buildProjectFile,
  deleteStoredProject,
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
const GOOGLE_ANALYTICS_MEASUREMENT_ID = 'G-T6NDKMFXHT';
const ANALYTICS_CONSENT_STORAGE_KEY =
  'firepit-parametric-masonry-designer-analytics-consent';
const ANALYTICS_CONSENT_VERSION_STORAGE_KEY =
  'firepit-parametric-masonry-designer-analytics-consent-version';
const ANALYTICS_CONSENT_VERSION = '2026-03-23';
const DETAILS_REFERENCES_KEY =
  'firepit-parametric-masonry-designer-details-references';
const SHOW_VARIANT_COMPARISON_KEY =
  'firepit-parametric-masonry-designer-show-variant-comparison';
const SHOW_OPTIONAL_INSIGHTS_KEY =
  'firepit-parametric-masonry-designer-show-optional-insights';
const SHOW_NEXT_STEPS_KEY = 'firepit-parametric-masonry-designer-show-next-steps';
const THEME_MODE_STORAGE_KEY = 'firepit-parametric-masonry-designer-theme-mode';

const Stage3D = lazy(() => import('./components/Stage3D'));
const ConstructionMode = lazy(() => import('./components/ConstructionMode'));
const KnowledgeCenter = lazy(() => import('./components/KnowledgeCenter'));

type ProjectStatus = {
  label: string;
  timestamp: string | null;
};

type AnalyticsConsent = 'unknown' | 'granted' | 'denied';

type PendingSnapshotAction = {
  type: 'overwrite' | 'delete';
  snapshot: StoredFirepitProjectSnapshot;
} | null;

type QuickPresetKey =
  | 'classic-propane'
  | 'wood-weekend'
  | 'compact-patio'
  | 'entertainer-wood'
  | 'balanced-gas'
  | 'square-social'
  | 'rectangular-host';

type QuickPresetGroupKey = 'round-popular' | 'more-shapes';

const QUICK_PRESET_CONFIG: Record<
  QuickPresetKey,
  { label: string; detail: string }
> = {
  'classic-propane': {
    label: 'Classic 36 in Propane',
    detail: 'Balanced default for most patios.',
  },
  'wood-weekend': {
    label: 'Weekend 42 in Wood',
    detail: 'Larger flame view for gatherings.',
  },
  'compact-patio': {
    label: 'Compact 30 in Patio Gas',
    detail: 'Smaller footprint for tighter spaces.',
  },
  'entertainer-wood': {
    label: 'Entertainer 48 in Wood',
    detail: 'Wide opening and taller social pit profile.',
  },
  'balanced-gas': {
    label: 'Balanced 36 in Natural Gas',
    detail: '36 in geometry with fixed gas utility feed.',
  },
  'square-social': {
    label: 'Square 36 in Wood',
    detail: 'Crisp square layout with a broad seating edge.',
  },
  'rectangular-host': {
    label: 'Rectangular 42 x 30 Propane',
    detail: 'Longer front edge for hosting and seating lines.',
  },
};

const QUICK_PRESET_GROUPS: Array<{
  key: QuickPresetGroupKey;
  label: string;
  description: string;
  presetKeys: QuickPresetKey[];
}> = [
  {
    key: 'round-popular',
    label: 'Round Popular',
    description: 'Most common circular baseline layouts.',
    presetKeys: ['classic-propane', 'wood-weekend', 'compact-patio'],
  },
  {
    key: 'more-shapes',
    label: 'More Shapes',
    description: 'Larger round plus square and rectangular options.',
    presetKeys: [
      'entertainer-wood',
      'balanced-gas',
      'square-social',
      'rectangular-host',
    ],
  },
];

function detectActiveQuickPreset(input: MasonryInput): QuickPresetKey | null {
  if (
    input.planShape === 'circular' &&
    input.innerDiameterIn === 36 &&
    input.wallHeightIn === 18 &&
    input.fuelType === 'propane' &&
    input.linerType === 'steel-ring'
  ) {
    return 'classic-propane';
  }

  if (
    input.planShape === 'circular' &&
    input.innerDiameterIn === 42 &&
    input.wallHeightIn === 16 &&
    input.fuelType === 'wood' &&
    input.linerType === 'fire-brick'
  ) {
    return 'wood-weekend';
  }

  if (
    input.planShape === 'circular' &&
    input.innerDiameterIn === 30 &&
    input.wallHeightIn === 16 &&
    input.fuelType === 'natural-gas' &&
    input.linerType === 'steel-ring'
  ) {
    return 'compact-patio';
  }

  if (
    input.planShape === 'circular' &&
    input.innerDiameterIn === 48 &&
    input.wallHeightIn === 18 &&
    input.fuelType === 'wood' &&
    input.linerType === 'fire-brick'
  ) {
    return 'entertainer-wood';
  }

  if (
    input.planShape === 'circular' &&
    input.innerDiameterIn === 36 &&
    input.wallHeightIn === 18 &&
    input.fuelType === 'natural-gas' &&
    input.linerType === 'steel-ring'
  ) {
    return 'balanced-gas';
  }

  if (
    input.planShape === 'square' &&
    input.innerWidthIn === 36 &&
    input.innerDepthIn === 36 &&
    input.wallHeightIn === 18 &&
    input.fuelType === 'wood' &&
    input.linerType === 'fire-brick'
  ) {
    return 'square-social';
  }

  if (
    input.planShape === 'rectangular' &&
    input.innerWidthIn === 42 &&
    input.innerDepthIn === 30 &&
    input.wallHeightIn === 18 &&
    input.fuelType === 'propane' &&
    input.linerType === 'steel-ring'
  ) {
    return 'rectangular-host';
  }

  return null;
}

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
type ThemeMode = 'light' | 'dark';
type SiteView =
  | 'designer'
  | 'guide'
  | 'tips'
  | 'research'
  | 'privacy'
  | 'terms';

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
  const [quickPresetGroup, setQuickPresetGroup] =
    useState<QuickPresetGroupKey>('round-popular');
  const [view, setView] = useState<ViewMode>('3d');
  const [stakeholderRenderSignal, setStakeholderRenderSignal] = useState<
    number | null
  >(null);
  const [glbExportSignal, setGlbExportSignal] = useState<number | null>(null);
  const [isRenderingImage, setIsRenderingImage] = useState(false);
  const [isExportingGlb, setIsExportingGlb] = useState(false);
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
  const [showClearBrowserDataConfirm, setShowClearBrowserDataConfirm] =
    useState(false);
  const [showWorkspaceTools, setShowWorkspaceTools] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cookieBannerPrimaryActionRef = useRef<HTMLButtonElement | null>(null);
  const hasInitializedAutosave = useRef(false);
  const hasConfiguredAnalytics = useRef(false);
  const [referencesOpen, setReferencesOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(DETAILS_REFERENCES_KEY);
    return stored === null ? false : stored === 'true';
  });
  const [showVariantComparison, setShowVariantComparison] =
    useState<boolean>(() => {
      if (typeof window === 'undefined') return false;
      return (
        window.localStorage.getItem(SHOW_VARIANT_COMPARISON_KEY) === 'true'
      );
    });
  const [showOptionalInsights, setShowOptionalInsights] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return false;
      const stored = window.localStorage.getItem(SHOW_OPTIONAL_INSIGHTS_KEY);
      return stored === null ? false : stored === 'true';
    },
  );
  const [showNextSteps, setShowNextSteps] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SHOW_NEXT_STEPS_KEY) === 'true';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    () => {
      if (typeof window === 'undefined') {
        return 'unknown';
      }

      const storedValue = window.localStorage.getItem(
        ANALYTICS_CONSENT_STORAGE_KEY,
      );
      const storedVersion = window.localStorage.getItem(
        ANALYTICS_CONSENT_VERSION_STORAGE_KEY,
      );
      if (storedVersion !== ANALYTICS_CONSENT_VERSION) {
        return 'unknown';
      }
      return storedValue === 'granted' || storedValue === 'denied'
        ? storedValue
        : 'unknown';
    },
  );
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const storedValue = window.localStorage.getItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
    );
    const storedVersion = window.localStorage.getItem(
      ANALYTICS_CONSENT_VERSION_STORAGE_KEY,
    );
    if (storedVersion !== ANALYTICS_CONSENT_VERSION) {
      return true;
    }
    return storedValue !== 'granted' && storedValue !== 'denied';
  });

  const ensureAnalyticsScriptLoaded = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const existingScript = document.getElementById('ga4-gtag-script');
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'ga4-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  };

  const updateAnalyticsConsent = (consent: AnalyticsConsent) => {
    if (typeof window === 'undefined') {
      return;
    }

    const analyticsWindow = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    const disableKey = `ga-disable-${GOOGLE_ANALYTICS_MEASUREMENT_ID}`;

    if (consent === 'granted') {
      (analyticsWindow as unknown as Record<string, unknown>)[disableKey] =
        false;
      ensureAnalyticsScriptLoaded();
      analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
      analyticsWindow.gtag =
        analyticsWindow.gtag ??
        ((...args: unknown[]) => {
          analyticsWindow.dataLayer?.push(args);
        });

      analyticsWindow.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      analyticsWindow.gtag('js', new Date());

      if (!hasConfiguredAnalytics.current) {
        analyticsWindow.gtag('config', GOOGLE_ANALYTICS_MEASUREMENT_ID, {
          anonymize_ip: true,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        });
        hasConfiguredAnalytics.current = true;
      } else {
        analyticsWindow.gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }

      return;
    }

    (analyticsWindow as unknown as Record<string, unknown>)[disableKey] = true;
    analyticsWindow.gtag?.('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  };

  const handleAnalyticsConsentChoice = (
    consent: Exclude<AnalyticsConsent, 'unknown'>,
  ) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
      window.localStorage.setItem(
        ANALYTICS_CONSENT_VERSION_STORAGE_KEY,
        ANALYTICS_CONSENT_VERSION,
      );
    }
    setAnalyticsConsent(consent);
    setShowCookieBanner(false);
    setProjectNotice(
      consent === 'granted'
        ? 'Analytics enabled by consent. You can change this anytime in Cookie Settings.'
        : 'Analytics disabled. You can change this anytime in Cookie Settings.',
    );
  };

  const handleOpenLegalView = (
    view: Extract<SiteView, 'privacy' | 'terms'>,
  ) => {
    handleOpenSiteView(view, true);
  };

  const handleOpenSiteView = (view: SiteView, scrollToTop = false) => {
    setSiteView(view);

    if (typeof window === 'undefined') {
      return;
    }

    const nextHash =
      view === 'designer'
        ? '#designer'
        : view === 'guide'
          ? '#instructions'
          : view === 'tips'
            ? '#tips'
            : view === 'research'
              ? '#field-notes'
              : view === 'privacy'
                ? '#privacy-policy'
                : '#terms-of-use';

    window.location.hash = nextHash;
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    updateAnalyticsConsent(analyticsConsent);
  }, [analyticsConsent]);

  useEffect(() => {
    if (!showCookieBanner) {
      return;
    }

    cookieBannerPrimaryActionRef.current?.focus();
  }, [showCookieBanner]);

  useEffect(() => {
    if (!showCookieBanner) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && analyticsConsent !== 'unknown') {
        setShowCookieBanner(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [analyticsConsent, showCookieBanner]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hash = window.location.hash.toLowerCase();
    if (hash === '#designer') {
      setSiteView('designer');
    } else if (hash === '#instructions') {
      setSiteView('guide');
    } else if (hash === '#tips') {
      setSiteView('tips');
    } else if (hash === '#field-notes') {
      setSiteView('research');
    } else if (hash === '#privacy-policy') {
      setSiteView('privacy');
    } else if (hash === '#terms-of-use') {
      setSiteView('terms');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-theme', themeMode);
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

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
    setShowWorkspaceTools(false);
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
    setShowWorkspaceTools(false);
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
    setShowWorkspaceTools(false);
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
    setShowWorkspaceTools(false);
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
      setShowWorkspaceTools(false);
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

  const handleStakeholderRenderComplete = (result: {
    ok: boolean;
    message: string;
  }) => {
    setIsRenderingImage(false);
    setProjectNotice(result.message);
    if (result.ok) {
      setProjectStatus({
        label: 'Exported stakeholder render',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleStakeholderRender = () => {
    setView('3d');
    setIsRenderingImage(true);
    setStakeholderRenderSignal((value) => (value ?? 0) + 1);
  };

  const handleGlbExportComplete = (result: { ok: boolean; message: string }) => {
    setIsExportingGlb(false);
    setProjectNotice(result.message);
    if (result.ok) {
      setProjectStatus({
        label: 'Exported GLB model',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleExportGlb = () => {
    setView('3d');
    setIsExportingGlb(true);
    setGlbExportSignal((value) => (value ?? 0) + 1);
  };

  const handleClearBrowserData = () => {
    deleteStoredProject(PROJECT_STORAGE_KEY);
    localStorage.removeItem(PROJECT_SNAPSHOTS_STORAGE_KEY);
    setSnapshots([]);
    setSelectedSnapshotId('');
    setProjectNotice(
      'Cleared all locally stored project data from this browser.',
    );
    setProjectStatus({
      label: 'Cleared browser data',
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

  const blockingWarningCodes = new Set([
    'clearance-too-low',
    'natural-stone-unsafe-type',
    'gas-vent-area-out-of-range',
    'gas-vent-layout-invalid',
    'gas-line-near-vent',
    'course-bearing-risk',
  ]);

  const hasBlockingWarnings = output.warnings.some((warning) =>
    blockingWarningCodes.has(warning.code),
  );
  const activeQuickPreset = useMemo(
    () => detectActiveQuickPreset(input),
    [input],
  );
  const selectedQuickPresetGroup =
    QUICK_PRESET_GROUPS.find((group) => group.key === quickPresetGroup) ??
    QUICK_PRESET_GROUPS[0];

  const nextSteps = useMemo(() => {
    const steps: Array<{
      key: string;
      label: string;
      status: 'done' | 'todo' | 'info';
    }> = [
      {
        key: 'clearance',
        label: 'Set structure clearance to at least 10 ft.',
        status: input.proximityToStructuresFt >= 10 ? 'done' : 'todo',
      },
      {
        key: 'venting',
        label: 'Keep venting at 18 sq in or more total open area.',
        status: output.ventSpec.totalOpenAreaSqIn >= 18 ? 'done' : 'todo',
      },
      {
        key: 'cuts',
        label: output.cutPlan.requiresCutting
          ? 'Review taper cut guidance before buying material.'
          : 'No taper cuts required at the current size.',
        status: output.cutPlan.requiresCutting ? 'todo' : 'done',
      },
    ];

    if (input.mortarJointIn > 0) {
      steps.push({
        key: 'curing',
        label: 'Reminder: allow 28 days of mortar curing before heavy use.',
        status: 'info',
      });
    }

    return steps;
  }, [input.mortarJointIn, input.proximityToStructuresFt, output]);

  const applyQuickPreset = (preset: QuickPresetKey) => {
    if (preset === 'classic-propane') {
      setInput((prev) => ({
        ...prev,
        planShape: 'circular',
        innerDiameterIn: 36,
        innerWidthIn: 36,
        innerDepthIn: 36,
        wallHeightIn: 18,
        fuelType: 'propane',
        linerType: 'steel-ring',
        ventCount: 4,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 12),
      }));
      setProjectNotice('Applied quick preset: Classic 36 in propane ring.');
      return;
    }

    if (preset === 'wood-weekend') {
      setInput((prev) => ({
        ...prev,
        planShape: 'circular',
        innerDiameterIn: 42,
        innerWidthIn: 42,
        innerDepthIn: 42,
        wallHeightIn: 16,
        fuelType: 'wood',
        linerType: 'fire-brick',
        ventCount: 4,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 12),
      }));
      setProjectNotice('Applied quick preset: Weekend 42 in wood pit.');
      return;
    }

    if (preset === 'entertainer-wood') {
      setInput((prev) => ({
        ...prev,
        planShape: 'circular',
        innerDiameterIn: 48,
        innerWidthIn: 48,
        innerDepthIn: 48,
        wallHeightIn: 18,
        fuelType: 'wood',
        linerType: 'fire-brick',
        ventCount: 6,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 12),
      }));
      setProjectNotice('Applied quick preset: Entertainer 48 in wood pit.');
      return;
    }

    if (preset === 'balanced-gas') {
      setInput((prev) => ({
        ...prev,
        planShape: 'circular',
        innerDiameterIn: 36,
        innerWidthIn: 36,
        innerDepthIn: 36,
        wallHeightIn: 18,
        fuelType: 'natural-gas',
        linerType: 'steel-ring',
        ventCount: 4,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 10),
      }));
      setProjectNotice('Applied quick preset: Balanced 36 in natural gas pit.');
      return;
    }

    if (preset === 'square-social') {
      setInput((prev) => ({
        ...prev,
        planShape: 'square',
        innerDiameterIn: 36,
        innerWidthIn: 36,
        innerDepthIn: 36,
        wallHeightIn: 18,
        fuelType: 'wood',
        linerType: 'fire-brick',
        ventCount: 4,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 12),
      }));
      setProjectNotice('Applied quick preset: Square 36 in wood pit.');
      return;
    }

    if (preset === 'rectangular-host') {
      setInput((prev) => ({
        ...prev,
        planShape: 'rectangular',
        innerDiameterIn: 42,
        innerWidthIn: 42,
        innerDepthIn: 30,
        wallHeightIn: 18,
        fuelType: 'propane',
        linerType: 'steel-ring',
        ventCount: 4,
        ventOpeningAreaSqIn: 5,
        proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 12),
      }));
      setProjectNotice(
        'Applied quick preset: Rectangular 42 x 30 propane pit.',
      );
      return;
    }

    setInput((prev) => ({
      ...prev,
      planShape: 'circular',
      innerDiameterIn: 30,
      innerWidthIn: 30,
      innerDepthIn: 30,
      wallHeightIn: 16,
      fuelType: 'natural-gas',
      linerType: 'steel-ring',
      ventCount: 4,
      ventOpeningAreaSqIn: 5,
      proximityToStructuresFt: Math.max(prev.proximityToStructuresFt, 10),
    }));
    setProjectNotice('Applied quick preset: Compact 30 in patio gas pit.');
  };

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
      <ConfirmDialog
        open={showClearBrowserDataConfirm}
        title='Clear Local Browser Data'
        message='Delete autosaved project data and all browser snapshots for this app on this device? This cannot be undone.'
        confirmLabel='Clear Data'
        tone='danger'
        onConfirm={() => {
          handleClearBrowserData();
          setShowClearBrowserDataConfirm(false);
        }}
        onCancel={() => setShowClearBrowserDataConfirm(false)}
      />

      <header className='mb-5 card-rise rounded-2xl border border-amber-900/20 bg-amber-100/70 p-4 shadow-lg backdrop-blur'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/75'>
              Fire Pit Design Studio
            </p>
            <h1 className='mt-1 text-2xl font-extrabold tracking-tight sm:text-[2.05rem]'>
              Parametric Masonry Designer
            </h1>
            <p className='mt-1 inline-flex items-center rounded-full border border-amber-900/20 bg-white/60 px-2.5 py-1 text-xs font-semibold text-amber-950'>
              Project: {projectName}
            </p>
            <p className='mt-1.5 max-w-2xl text-sm leading-5 sm:text-[15px]'>
              Plan masonry fire pits with real unit dimensions, venting rules,
              safety checks, material estimates, and build-focused reference
              guidance.
            </p>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <nav className='flex flex-wrap gap-2' aria-label='Site sections'>
              {siteTabs.map((tab) => {
                const selected = siteView === tab.value;

                return (
                  <button
                    key={tab.value}
                    type='button'
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      selected
                        ? 'bg-amber-900 text-amber-50'
                        : 'bg-white/70 text-amber-900 hover:bg-white'
                    }`}
                    onClick={() => handleOpenSiteView(tab.value)}
                    aria-current={selected ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className='ml-auto flex items-center gap-2'>
              {!showWorkspaceTools && (
                <button
                  type='button'
                  className='rounded-full border border-amber-900/20 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-white'
                  onClick={() => setShowWorkspaceTools(true)}
                  aria-controls='project-workspace-panel'
                  aria-expanded={showWorkspaceTools}
                >
                  Project File
                </button>
              )}

              <button
                type='button'
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  themeMode === 'dark'
                    ? 'border-amber-700/45 bg-amber-900/45 text-amber-200 hover:bg-amber-900/60'
                    : 'border-amber-900/20 bg-white/70 text-amber-900 hover:bg-white'
                }`}
                onClick={() =>
                  setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
                }
                aria-label={
                  themeMode === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
                }
                title={
                  themeMode === 'dark' ? 'Dark mode' : 'Light mode'
                }
              >
                {themeMode === 'dark' ? (
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.7'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M6 16h12' />
                    <path d='M7 16c.8 2 2.5 3 5 3s4.2-1 5-3' />
                    <path d='M9.6 16 11 14.6m3.4 1.4L13 14.6' />
                    <path d='M12 6.2c1.5 1.3 2.4 2.6 2.4 4a2.4 2.4 0 1 1-4.8 0c0-1.1.6-2.3 1.8-3.7' />
                  </svg>
                ) : (
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.7'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M6 16h12' />
                    <path d='M7 16c.8 2 2.5 3 5 3s4.2-1 5-3' />
                    <path d='M9.6 16 11 14.6m3.4 1.4L13 14.6' />
                    <path d='M12 11.7c.9.9 1.3 1.7 1.3 2.4a1.3 1.3 0 0 1-2.6 0c0-.6.3-1.3 1-2.2' />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {showWorkspaceTools && (
          <details
            open
            onToggle={(event) =>
              setShowWorkspaceTools(event.currentTarget.open)
            }
            className='group mt-3 rounded-2xl border border-amber-900/20 bg-white/35'
            id='project-workspace-panel'
          >
            <summary className='cursor-pointer list-none px-4 py-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
                    Project File
                  </p>
                  <p className='mt-1 text-sm text-amber-900/80'>
                    Name, import/export, autosave, and snapshot controls.
                  </p>
                </div>
                <span className='rounded-full border border-amber-900/20 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900'>
                  Collapse
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
        )}
      </header>

      {siteView === 'designer' ? (
        <div className='grid gap-4 lg:grid-cols-[360px_1fr]'>
          <div className='order-2 space-y-4 lg:order-1'>
            <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
              <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/75'>
                Quick Start
              </p>
              <p className='mt-2 text-sm text-amber-900/80'>
                Pick a starter setup, then fine-tune details in Design Inputs
                below.
              </p>
              <p className='mt-2 text-xs text-amber-900/70'>
                These are common starter baselines. Apply one, then adjust any
                field or save your own snapshot style.
              </p>
              <div className='mt-3 grid grid-cols-2 gap-2'>
                {QUICK_PRESET_GROUPS.map((group) => {
                  const selected = quickPresetGroup === group.key;

                  return (
                    <button
                      key={group.key}
                      type='button'
                      className={`w-full rounded-full border px-3 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/60 ${
                        selected
                          ? 'border-amber-900/45 bg-amber-900 text-amber-50'
                          : 'border-amber-900/20 bg-white/80 text-amber-900 hover:bg-white'
                      }`}
                      onClick={() => setQuickPresetGroup(group.key)}
                      aria-label={`Show ${group.label} presets`}
                      title={`Show ${group.label} presets`}
                      aria-pressed={selected}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
              <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                {selectedQuickPresetGroup.presetKeys.map((presetKey) => {
                  const selected = activeQuickPreset === presetKey;
                  const preset = QUICK_PRESET_CONFIG[presetKey];

                  return (
                    <button
                      key={presetKey}
                      type='button'
                      className={`rounded-2xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/60 ${
                        selected
                          ? 'border-amber-900/45 bg-amber-200/55 text-amber-950'
                          : 'border-amber-900/20 bg-white/85 text-amber-950 hover:bg-white'
                      }`}
                      onClick={() => applyQuickPreset(presetKey)}
                      aria-label={`Apply ${preset.label} quick start preset`}
                      title={`Apply ${preset.label} quick start`}
                      aria-pressed={selected}
                    >
                      <span className='block text-xs font-semibold'>
                        {preset.label}
                      </span>
                      <span className='mt-0.5 block text-[11px] text-amber-900/75'>
                        {preset.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <ControlPanel
              input={input}
              setInput={setInput}
              noCutGuidance={noCutGuidance}
            />
          </div>

          <section className='order-1 min-w-0 space-y-4 lg:order-2'>
            <div className='card-rise grid gap-2 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-3 shadow-lg sm:grid-cols-3'>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Units Per Layer
                </p>
                <p className='text-xl font-bold sm:text-2xl'>
                  {output.unitsPerCourseRounded}
                </p>
              </div>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Total Units
                </p>
                <p className='text-xl font-bold sm:text-2xl'>{output.totalUnits}</p>
              </div>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Shape
                </p>
                <p className='text-xl font-bold sm:text-2xl'>{output.planShape}</p>
              </div>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Cap Units
                </p>
                <p className='text-xl font-bold sm:text-2xl'>
                  {output.capstone.capUnitsPerCourseRounded}
                </p>
              </div>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Liner
                </p>
                <p className='text-base font-bold sm:text-lg'>
                  {output.linerSpec.type === 'none'
                    ? 'None'
                    : output.linerSpec.type === 'fire-brick'
                      ? 'Fire Brick'
                      : 'Steel Ring'}
                </p>
              </div>
              <div className='rounded-xl border border-amber-900/15 border-t-2 border-t-amber-700/70 bg-white/70 px-3 py-2'>
                <p className='text-[11px] uppercase tracking-wide text-amber-950/90'>
                  Stone Base (yd3)
                </p>
                <p className='text-xl font-bold sm:text-2xl'>
                  {output.foundation.stoneVolumeCubicYards.toFixed(2)}
                </p>
                <p className='mt-1'>
                  <FoundationRiskBadge risk={foundationAdvisory.risk} />
                </p>
              </div>
            </div>

            <div className='flex gap-2' role='tablist' aria-label='View mode'>
              <button
                id='visualization-tab-3d'
                role='tab'
                aria-selected={view === '3d'}
                aria-controls='visualization-panel'
                className={`rounded-full px-4 py-2 text-sm font-semibold ${view === '3d' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
                onClick={() => setView('3d')}
              >
                3D Preview
              </button>
              <button
                id='visualization-tab-construction'
                role='tab'
                aria-selected={view === 'construction'}
                aria-controls='visualization-panel'
                className={`rounded-full px-4 py-2 text-sm font-semibold ${view === 'construction' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
                onClick={() => setView('construction')}
              >
                Build Plan
              </button>
              <button
                className='rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-50'
                onClick={handleStakeholderRender}
                disabled={isRenderingImage}
              >
                {isRenderingImage ? 'Rendering Image…' : 'Save Image'}
              </button>
              <button
                className='rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900'
                onClick={handleExportGlb}
                disabled={isExportingGlb}
              >
                {isExportingGlb ? 'Exporting GLB…' : 'Export GLB'}
              </button>
            </div>
            {/* <p className='text-xs text-amber-900/75'>
              3D Preview: drag to rotate and scroll to zoom. Build Plan: use
              this for print-ready layout and cut references. Stakeholder
              Render: export a polished still image to share. Export GLB: save
              a 3D model for Blender/Fusion workflows. GLB export uses a
              CAD-safe material path (no texture maps) for compatibility.
            </p>
            {projectNotice && (
              <p className='rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-xs text-amber-950/85'>
                {projectNotice}
              </p>
            )} */}

            <div
              id='visualization-panel'
              role='tabpanel'
              aria-labelledby={
                view === '3d'
                  ? 'visualization-tab-3d'
                  : 'visualization-tab-construction'
              }
            >
              <Suspense
                fallback={
                  <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-6 text-sm font-medium text-amber-900/80 shadow-lg'>
                    Loading visualization...
                  </div>
                }
              >
                {view === '3d' && (
                  <Stage3D
                    output={output}
                    seatingFurnitureCount={input.seatingFurnitureCount}
                    captureSignal={stakeholderRenderSignal}
                    glbExportSignal={glbExportSignal}
                    onStakeholderRenderComplete={handleStakeholderRenderComplete}
                    onModelExportComplete={handleGlbExportComplete}
                  />
                )}
                {view === 'construction' && (
                  <ConstructionMode input={input} output={output} />
                )}
              </Suspense>
            </div>

            <BillOfMaterials output={output} />

            <details
              className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-3 shadow-lg'
              open={showOptionalInsights}
              onToggle={(event) => {
                const next = event.currentTarget.open;
                setShowOptionalInsights(next);
                window.localStorage.setItem(
                  SHOW_OPTIONAL_INSIGHTS_KEY,
                  String(next),
                );
              }}
            >
              <summary className='cursor-pointer list-none'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/90'>
                    Optional Insights
                  </p>
                  <span className='rounded-full border border-amber-900/20 bg-white px-3 py-1 text-xs font-semibold text-amber-950'>
                    {showOptionalInsights ? 'Hide' : 'Show'}
                  </span>
                </div>
              </summary>

              <div className='mt-3 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2'>
                  <p className='text-xs text-amber-900/80'>
                    Toggle advanced tools for comparison and advisory analysis.
                  </p>
                  <button
                    type='button'
                    className='rounded-full border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
                    onClick={() => {
                      setShowVariantComparison((prev) => {
                        const next = !prev;
                        window.localStorage.setItem(
                          SHOW_VARIANT_COMPARISON_KEY,
                          String(next),
                        );
                        return next;
                      });
                    }}
                    aria-pressed={showVariantComparison}
                  >
                    {showVariantComparison
                      ? 'Hide Variant Comparison'
                      : 'Show Variant Comparison'}
                  </button>
                </div>

                {showVariantComparison && (
                  <ProjectComparisonPanel
                    currentProjectName={projectName}
                    currentInput={input}
                    currentOutput={output}
                    snapshots={snapshots}
                  />
                )}

                <RegionalCodeChecker input={input} output={output} />

                <MaterialOptimizationSuggestions input={input} output={output} />
              </div>
            </details>

            <details
              className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'
              open={showNextSteps}
              onToggle={(event) => {
                const next = event.currentTarget.open;
                setShowNextSteps(next);
                window.localStorage.setItem(SHOW_NEXT_STEPS_KEY, String(next));
              }}
            >
              <summary className='cursor-pointer list-none'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/90'>
                    What To Do Next
                  </p>
                  <div className='flex items-center gap-2'>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        hasBlockingWarnings
                          ? 'border-red-800/25 bg-red-100 text-red-900'
                          : 'border-emerald-800/25 bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {hasBlockingWarnings
                        ? 'Address safety items first'
                        : 'Ready to plan build'}
                    </span>
                    <span className='rounded-full border border-amber-900/20 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950'>
                      {showNextSteps ? 'Hide' : 'Show'}
                    </span>
                  </div>
                </div>
              </summary>

              <ul className='mt-3 space-y-2'>
                {nextSteps.map((step) => (
                  <li
                    key={step.key}
                    className='flex items-start gap-2 rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-sm text-amber-950/90'
                  >
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        step.status === 'done'
                          ? 'bg-emerald-600 text-emerald-50'
                          : step.status === 'todo'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-sky-200 text-sky-900'
                      }`}
                    >
                      {step.status === 'done'
                        ? 'OK'
                        : step.status === 'todo'
                          ? '!'
                          : 'i'}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ul>
            </details>

            <details
              className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'
              open={referencesOpen}
              onToggle={(e) => {
                const next = e.currentTarget.open;
                setReferencesOpen(next);
                window.localStorage.setItem(
                  DETAILS_REFERENCES_KEY,
                  String(next),
                );
              }}
            >
              <summary className='cursor-pointer list-none'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                    Detailed References
                  </p>
                  <span className='rounded-full border border-amber-900/20 bg-white px-3 py-1 text-xs font-semibold text-amber-950'>
                    Safety diagram and full report
                  </span>
                </div>
              </summary>

              <div className='mt-3 space-y-4'>
                <SafetyClearanceDiagram input={input} output={output} />

                <ProjectInfoCard
                  input={input}
                  output={output}
                  foundationAdvisory={foundationAdvisory}
                  noCutGuidance={noCutGuidance}
                />
              </div>
            </details>
          </section>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-6 text-sm font-medium text-amber-900/80 shadow-lg'>
              Loading knowledge center...
            </div>
          }
        >
          <KnowledgeCenter view={siteView} />
        </Suspense>
      )}

      <footer className='mt-8 card-rise rounded-2xl border border-amber-900/20 bg-amber-100/65 p-5 shadow-lg backdrop-blur'>
        <div className='grid gap-5 md:grid-cols-3'>
          <section>
            <h2 className='text-sm font-semibold uppercase tracking-[0.15em] text-amber-900/80'>
              About This Designer
            </h2>
            <p className='mt-2 text-sm leading-6 text-amber-950/85'>
              Parametric Masonry Designer provides engineering-aware firepit
              planning with real masonry dimensions, venting logic, safety
              checks, and build sequencing guidance.
            </p>
          </section>

          <section>
            <h2 className='text-sm font-semibold uppercase tracking-[0.15em] text-amber-900/80'>
              Creator Links
            </h2>
            <ul className='mt-2 space-y-2 text-sm'>
              <li>
                <a
                  href='https://www.janhorak.dev'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 font-semibold text-amber-900 underline decoration-amber-900/40 underline-offset-4 hover:text-amber-950'
                >
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M3.5 12h17' />
                    <path d='M12 3.5a15 15 0 0 1 0 17' />
                    <path d='M12 3.5a15 15 0 0 0 0 17' />
                    <circle cx='12' cy='12' r='9' />
                  </svg>
                  <span>Portfolio: janhorak.dev</span>
                </a>
              </li>
              <li>
                <a
                  href='https://github.com/MrJanHorak'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 font-semibold text-amber-900 underline decoration-amber-900/40 underline-offset-4 hover:text-amber-950'
                >
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    className='h-4 w-4'
                    fill='currentColor'
                  >
                    <path d='M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18a2.65 2.65 0 0 0-1.11-1.47c-.91-.62.07-.6.07-.6a2.1 2.1 0 0 1 1.53 1.03 2.14 2.14 0 0 0 2.92.84 2.13 2.13 0 0 1 .64-1.34c-2.22-.25-4.55-1.11-4.55-4.93a3.86 3.86 0 0 1 1.03-2.68 3.58 3.58 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.47 9.47 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02a3.58 3.58 0 0 1 .1 2.64 3.85 3.85 0 0 1 1.03 2.68c0 3.83-2.33 4.68-4.56 4.93a2.39 2.39 0 0 1 .68 1.86v2.77c0 .27.18.58.69.48A10 10 0 0 0 12 2Z' />
                  </svg>
                  <span>GitHub: @MrJanHorak</span>
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-sm font-semibold uppercase tracking-[0.15em] text-amber-900/80'>
              Privacy And Data (GDPR)
            </h2>
            <p className='mt-2 text-sm leading-6 text-amber-950/85'>
              This app stores project state in your browser (local storage) for
              autosave and snapshots. Google Analytics is loaded only after
              explicit consent, with ad features disabled and IP anonymization
              enabled.
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
                onClick={() => handleOpenLegalView('privacy')}
              >
                Privacy Policy
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
                onClick={() => handleOpenLegalView('terms')}
              >
                Terms Of Use
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
                onClick={() => setShowCookieBanner(true)}
              >
                Cookie Settings
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
                onClick={() => setShowClearBrowserDataConfirm(true)}
              >
                Clear Local Browser Data
              </button>
            </div>
          </section>
        </div>

        <div className='mt-5 border-t border-amber-900/20 pt-3 text-xs text-amber-900/80'>
          <p>
            Copyright {new Date().getFullYear()} Jan Horak. All rights reserved.
          </p>
          <p className='mt-1'>
            By using this tool, you are responsible for validating local code,
            permitting requirements, and safety clearances before construction.
          </p>
          <p className='mt-1'>
            Analytics consent policy version: {ANALYTICS_CONSENT_VERSION}.
          </p>
        </div>
      </footer>

      {showCookieBanner && (
        <div
          className='fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4'
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              analyticsConsent !== 'unknown'
            ) {
              setShowCookieBanner(false);
            }
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='analytics-consent-title'
            aria-describedby='analytics-consent-description'
            className='w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-amber-900/25 bg-amber-50/95 p-4 shadow-2xl backdrop-blur'
          >
            <h2
              id='analytics-consent-title'
              className='text-sm font-semibold uppercase tracking-[0.15em] text-amber-900/85'
            >
              Analytics Consent
            </h2>
            <p
              id='analytics-consent-description'
              className='mt-2 text-sm leading-6 text-amber-950/90'
            >
              We use Google Analytics only after opt-in consent to understand
              aggregate usage and improve the site. For stricter compliance
              across regions, analytics is disabled by default worldwide until
              you choose.
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              <button
                ref={cookieBannerPrimaryActionRef}
                type='button'
                className='rounded-full border border-emerald-700/30 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700'
                onClick={() => handleAnalyticsConsentChoice('granted')}
              >
                Accept Analytics
              </button>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100'
                onClick={() => handleAnalyticsConsentChoice('denied')}
              >
                Decline Analytics
              </button>
              {analyticsConsent !== 'unknown' && (
                <button
                  type='button'
                  className='rounded-full border border-amber-900/25 bg-transparent px-4 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100/60'
                  onClick={() => setShowCookieBanner(false)}
                >
                  Close
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
