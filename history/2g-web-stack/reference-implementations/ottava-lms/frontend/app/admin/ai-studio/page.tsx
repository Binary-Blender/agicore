'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import TabNavigation from '@/components/ai-studio/TabNavigation';
import Toast from '@/components/ai-studio/Toast';
import PolicyUploadTab from '@/components/ai-studio/PolicyUploadTab';
import LyricsGeneratorTab from '@/components/ai-studio/LyricsGeneratorTab';
import ReminderPhrasesTab from '@/components/ai-studio/ReminderPhrasesTab';
import QuizBuilderTab from '@/components/ai-studio/QuizBuilderTab';
import SongGeneratorTab from '@/components/ai-studio/SongGeneratorTab';
import AssetRepositoryTab from '@/components/ai-studio/AssetRepositoryTab';
import QcQueueTab from '@/components/ai-studio/QcQueueTab';
import ImageGenerationTab from '@/components/ai-studio/ImageGenerationTab';
import ImageToVideoTab from '@/components/ai-studio/ImageToVideoTab';
import { aiAPI, trainingModulesAPI } from '@/lib/api';
import { createEmptyOverlay, normalizeOverlayPayload, OverlayPayload } from '@/lib/overlay';

interface ModuleSong {
  id: string;
  song_url: string;
  song_style?: string | null;
  song_duration_seconds?: number | null;
  created_at?: string | null;
  status?: string | null;
  asset_id?: string | null;
}

interface TrainingModule {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  policy_summary_text?: string | null;
  emphasis_prompt?: string | null;
  ai_song_lyrics?: string | null;
  ai_song_url?: string | null;
  ai_song_duration_seconds?: number | null;
  ai_song_style?: string | null;
  ai_song_generated_at?: string | null;
  ai_overlay_texts?: OverlayPayload | string | null;
  ai_songs?: ModuleSong[] | null;
}

interface ModuleMetaForm {
  title: string;
  category: string;
  description: string;
}

type DraftPayload = {
  moduleId?: string | null;
  policyText?: string;
  emphasisPrompt?: string;
  lyrics?: string;
  overlayState?: OverlayPayload;
  moduleMeta?: ModuleMetaForm;
  timestamp?: number;
  isDraft?: boolean;
};

const buildDraftKey = (moduleId?: string) =>
  moduleId ? `ai-studio-draft-${moduleId}` : 'ai-studio-draft-global';

const readDraft = (moduleId?: string): DraftPayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(buildDraftKey(moduleId));
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const writeDraft = (moduleId: string | undefined, data: DraftPayload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(buildDraftKey(moduleId), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
};

const TABS = [
  { id: 'policy-upload', label: 'Policy Upload' },
  { id: 'lyrics-generator', label: 'Lyrics Generator' },
  { id: 'reminder-phrases', label: 'Reminder Phrases' },
  { id: 'song-generator', label: 'Song Generator' },
  { id: 'image-generation', label: 'Image Generation' },
  { id: 'image-to-video', label: 'Image to Video' },
  { id: 'quiz-builder', label: 'Quiz Builder' },
  { id: 'asset-repository', label: 'Asset Library' },
  { id: 'qc-queue', label: 'QC Queue' },
];

const MODULE_REQUIRED_TABS = new Set([
  'policy-upload',
  'lyrics-generator',
  'reminder-phrases',
  'song-generator',
  'image-generation',
  'image-to-video',
  'quiz-builder',
]);

const defaultOverlay = (): OverlayPayload => createEmptyOverlay();

const initialModuleMeta: ModuleMetaForm = {
  title: '',
  category: '',
  description: '',
};


export default function AIStudioPage() {
  // Tab management
  const [activeTab, setActiveTab] = useState('policy-upload');
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);

  // Data state
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [moduleToLoadId, setModuleToLoadId] = useState('');
  const [shouldAutoLoad, setShouldAutoLoad] = useState(false);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [policyText, setPolicyText] = useState('');
  const [emphasisPrompt, setEmphasisPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsUsage, setLyricsUsage] = useState('');
  const [overlayState, setOverlayState] = useState<OverlayPayload>(defaultOverlay());
  const [overlayUsage, setOverlayUsage] = useState('');
  const [songInfo, setSongInfo] = useState({
    url: '',
    duration_seconds: null as number | null,
    style: '',
    generated_at: '' as string | null,
  });
  const [songHistory, setSongHistory] = useState<ModuleSong[]>([]);
  const [deletingSongId, setDeletingSongId] = useState('');
  const [songGenerating, setSongGenerating] = useState(false);
  const [moduleMetaForm, setModuleMetaForm] = useState<ModuleMetaForm>(initialModuleMeta);
  const [isDraftModule, setIsDraftModule] = useState(false);
  const [quizHasQuestions, setQuizHasQuestions] = useState(false);
  const [qcRefreshToken, setQcRefreshToken] = useState(0);
  const [clearedPendingAssets, setClearedPendingAssets] = useState<Set<string>>(new Set());

  // Loading states
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<'save' | 'create' | null>(null);

  // UI state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const saveDraft = useCallback(
    (overrides?: Partial<DraftPayload>) => {
      const moduleReference = !isDraftModule && selectedModuleId ? selectedModuleId : undefined;
      const payload: DraftPayload = {
        moduleId: moduleReference || null,
        policyText,
        emphasisPrompt,
        lyrics,
        overlayState,
        moduleMeta: moduleMetaForm,
        timestamp: Date.now(),
        isDraft: isDraftModule,
        ...overrides,
      };
      if (moduleReference) {
        writeDraft(moduleReference, payload);
      }
      writeDraft(undefined, payload);
    },
    [isDraftModule, selectedModuleId, policyText, emphasisPrompt, lyrics, overlayState, moduleMetaForm]
  );

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [saveDraft]);

  // Track completed tabs
  useEffect(() => {
    const completed: string[] = [];

    if (policyText.trim()) {
      completed.push('policy-upload');
    }

    if (lyrics.trim()) {
      completed.push('lyrics-generator');
    }

    if (overlayState.reinforcement.some((p) => p.trim()) || overlayState.policy_highlights.some((p) => p.trim())) {
      completed.push('reminder-phrases');
    }

    if (songHistory.some((song) => (song.status || 'approved') === 'approved')) {
      completed.push('song-generator');
    }
    if (quizHasQuestions) {
      completed.push('quiz-builder');
    }

    setCompletedTabs(completed);
  }, [policyText, lyrics, overlayState, songHistory, quizHasQuestions]);

  const loadFromLocalStorage = () => {
    const saved = readDraft();
    if (saved && saved.timestamp && Date.now() - saved.timestamp < 24 * 60 * 60 * 1000) {
      setPolicyText(saved.policyText || '');
      setEmphasisPrompt(saved.emphasisPrompt || '');
      setLyrics(saved.lyrics || '');
      setOverlayState(
        saved.overlayState ? normalizeOverlayPayload(saved.overlayState) : defaultOverlay()
      );
      if (saved.moduleMeta) {
        setModuleMetaForm(saved.moduleMeta);
      }
      if (saved.moduleId) {
        setModuleToLoadId(saved.moduleId);
        setShouldAutoLoad(true);
        setIsDraftModule(false);
      } else if (saved.isDraft) {
        const hasDraftMeta =
          !!saved.moduleMeta?.title?.trim() ||
          !!saved.moduleMeta?.category?.trim() ||
          !!saved.moduleMeta?.description?.trim();
        const hasDraftContent =
          hasDraftMeta ||
          !!saved.policyText?.trim() ||
          !!saved.emphasisPrompt?.trim() ||
          !!saved.lyrics?.trim() ||
          saved.overlayState?.reinforcement?.some((item) => item.trim()) ||
          saved.overlayState?.policy_highlights?.some((item) => item.trim());
        if (hasDraftContent) {
          setIsDraftModule(true);
          setActiveTab('policy-upload');
        }
      }
    }
  };

  const moduleOptions = useMemo(
    () => [...modules].sort((a, b) => a.title.localeCompare(b.title)),
    [modules]
  );
  const currentModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const applyModuleToWorkspace = useCallback((module: TrainingModule) => {
    const overlayPayload = normalizeOverlayPayload(module.ai_overlay_texts);
    const draft = readDraft(module.id);
    const draftOverlay = draft?.overlayState
      ? normalizeOverlayPayload(draft.overlayState)
      : null;
    setSelectedModuleId(module.id);
    setModuleToLoadId(module.id);
    setIsDraftModule(false);
    // Use draft values only if they have content, otherwise use module data
    setPolicyText(draft?.policyText?.trim() ? draft.policyText : module.policy_summary_text ?? '');
    setEmphasisPrompt(draft?.emphasisPrompt?.trim() ? draft.emphasisPrompt : module.emphasis_prompt ?? '');
    setLyrics(draft?.lyrics?.trim() ? draft.lyrics : module.ai_song_lyrics ?? '');
    const hasDraftOverlay = draftOverlay && (
      draftOverlay.reinforcement?.some((item) => item.trim()) ||
      draftOverlay.policy_highlights?.some((item) => item.trim())
    );
    setOverlayState(hasDraftOverlay && draftOverlay ? draftOverlay : overlayPayload);
    setPolicyFile(null);
    setLyricsUsage('');
    setOverlayUsage('');
    setSongInfo({
      url: module.ai_song_url || '',
      duration_seconds: module.ai_song_duration_seconds || null,
      style: module.ai_song_style || '',
      generated_at: (module as any).ai_song_generated_at || null,
    });
    setSongHistory(Array.isArray(module.ai_songs) ? module.ai_songs : []);
    setModuleMetaForm({
      title: draft?.moduleMeta?.title?.trim() ? draft.moduleMeta.title : module.title ?? '',
      category: draft?.moduleMeta?.category?.trim() ? draft.moduleMeta.category : module.category ?? '',
      description: draft?.moduleMeta?.description?.trim() ? draft.moduleMeta.description : module.description ?? '',
    });
    setQuizHasQuestions(false);
  }, []);

  const loadModuleAssetsById = useCallback(
    async (moduleId: string, options?: { silent?: boolean; successMessage?: string }) => {
      try {
        const response = await trainingModulesAPI.getById(moduleId);
        const module = response?.training_module;
        if (!module) {
          if (!options?.silent) {
            showToast('error', 'Module not found.');
          }
          return false;
        }
        setModules((prev) => {
          const exists = prev.some((item) => item.id === module.id);
          if (exists) {
            return prev.map((item) => (item.id === module.id ? module : item));
          }
          return [...prev, module];
        });
        applyModuleToWorkspace(module);
        if (!options?.silent) {
          showToast('success', options?.successMessage || `Loaded AI assets from "${module.title}".`);
        }
        return true;
      } catch (error) {
        console.error('Failed to load module details', error);
        if (!options?.silent) {
          showToast('error', 'Unable to load that module. Try again.');
        }
        return false;
      }
    },
    [applyModuleToWorkspace, showToast]
  );

  const refreshModuleById = useCallback(
    async (moduleId: string) => {
      try {
        const response = await trainingModulesAPI.getById(moduleId);
        const updated = response?.training_module;
        if (!updated) return;
        setModules((prev) => {
          const exists = prev.some((module) => module.id === updated.id);
          if (exists) {
            return prev.map((module) => (module.id === updated.id ? updated : module));
          }
          return [...prev, updated];
        });
        if (selectedModuleId === updated.id) {
          applyModuleToWorkspace(updated);
        }
      } catch (error) {
        console.error('Failed to refresh module', error);
      }
    },
    [selectedModuleId, applyModuleToWorkspace]
  );

  const handleModuleRefresh = useCallback(
    (moduleId?: string | null) => {
      if (!moduleId) return;
      refreshModuleById(moduleId);
    },
    [refreshModuleById]
  );

  // Load modules on mount
  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await trainingModulesAPI.getAll();
        setModules(response.training_modules || []);
      } catch (error) {
        console.error('Failed to load modules', error);
        showToast('error', 'Unable to load modules');
      }
    };
    loadModules();
    loadFromLocalStorage();
  }, [showToast]);

  useEffect(() => {
    if (!shouldAutoLoad || !modules.length) {
      return;
    }

    const resolveLoad = async () => {
      if (moduleToLoadId) {
        const loaded = await loadModuleAssetsById(moduleToLoadId, { silent: true });
        setShouldAutoLoad(false);
        if (!loaded && modules[0]) {
          setModuleToLoadId(modules[0].id);
          await loadModuleAssetsById(modules[0].id, { silent: true });
        }
        return;
      }

      const fallbackId = modules[0]?.id;
      if (fallbackId) {
        setModuleToLoadId(fallbackId);
        await loadModuleAssetsById(fallbackId, { silent: true });
      }
      setShouldAutoLoad(false);
    };

    resolveLoad();
  }, [modules, moduleToLoadId, shouldAutoLoad, loadModuleAssetsById]);

  useEffect(() => {
    setQuizHasQuestions(false);
  }, [selectedModuleId, isDraftModule]);

  const handleLoadModuleAssets = async () => {
    if (!moduleToLoadId) {
      showToast('error', 'Select a module to load.');
      return;
    }
    await loadModuleAssetsById(moduleToLoadId);
  };

  const validatePolicyInputs = (options: { requireFile?: boolean } = {}) => {
    const { requireFile = false } = options;
    if (!policyText.trim()) {
      showToast('error', 'Paste the policy text so AI can read it.');
      return false;
    }
    if (requireFile && !policyFile) {
      showToast('error', 'Upload the policy PDF so it can be linked in the module.');
      return false;
    }
    return true;
  };

  const handleGenerateLyrics = async () => {
    if (!selectedModuleId && !isDraftModule) {
      showToast('error', 'Load or start a training module before generating lyrics.');
      return;
    }
    if (!validatePolicyInputs()) return;

    const formData = new FormData();
    const resolvedEmphasis =
      emphasisPrompt.trim() ||
      'Highlight the most important behavioral expectations and compliance rules from this policy.';
    formData.append('emphasis_prompt', resolvedEmphasis);
    if (policyFile) formData.append('policy_document', policyFile);
    if (policyText.trim()) formData.append('policy_summary', policyText.trim());

    setLyricsLoading(true);
    try {
      const response = await aiAPI.generateLyrics(formData);
      setLyrics(response.lyrics || '');
      setLyricsUsage(
        response.usage
          ? `Prompt ${response.usage.prompt_tokens || 0} • Completion ${
              response.usage.completion_tokens || 0
            }`
          : ''
      );
      showToast('success', 'Lyrics generated! Edit away or proceed to reminder phrases.');
      saveDraft();
    } catch (error: any) {
      console.error('Lyric generation failed', error);
      showToast('error', error?.response?.data?.error || 'Failed to generate lyrics');
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleGenerateOverlays = async () => {
    if (!selectedModuleId && !isDraftModule) {
      showToast('error', 'Load or start a training module before generating reminder phrases.');
      return;
    }
    if (!lyrics.trim()) {
      showToast('error', 'Generate or paste lyrics before creating reminder text.');
      return;
    }
    if (!validatePolicyInputs()) return;

    const formData = new FormData();
    formData.append('song_lyrics', lyrics.trim());
    if (policyFile) formData.append('policy_document', policyFile);
    if (policyText.trim()) formData.append('policy_summary', policyText.trim());

    setOverlayLoading(true);
    try {
      const response = await aiAPI.generateOverlays(formData);
      const normalized = normalizeOverlayPayload({
        reinforcement: response.reinforcement,
        policy_highlights: response.policy_highlights,
        combined: response.combined,
      });
      setOverlayState(normalized);
      setOverlayUsage(
        response.usage
          ? `Prompt ${response.usage.prompt_tokens || 0} • Completion ${
              response.usage.completion_tokens || 0
            }`
          : ''
      );
      showToast('success', 'Reminder phrases ready!');
      saveDraft();
    } catch (error: any) {
      console.error('Overlay generation failed', error);
      showToast('error', error?.response?.data?.error || 'Failed to generate reminder text');
    } finally {
      setOverlayLoading(false);
    }
  };

  const handleGenerateSong = async ({
    preset,
    customStyle,
    durationSeconds,
    emphasisPoints,
  }: {
    preset: string;
    customStyle: string;
    durationSeconds: number;
    emphasisPoints: string[];
  }) => {
    if (!selectedModuleId || isDraftModule) {
      showToast('error', 'Save the module before generating a song.');
      return;
    }
    if (!lyrics.trim()) {
      showToast('error', 'Generate lyrics first before composing the song.');
      return;
    }

    setSongGenerating(true);
    try {
      const response = await aiAPI.generateSong({
        training_module_id: selectedModuleId,
        lyrics: lyrics.trim(),
        style_preset: preset,
        custom_style: customStyle.trim() || undefined,
        duration_ms: Math.round(durationSeconds * 1000),
        emphasis_points: emphasisPoints,
      });

      const historyEntry = response?.history_entry;
      if (historyEntry) {
        const normalizedEntry = {
          ...historyEntry,
          status: historyEntry.status || 'pending',
        };
        setSongHistory((prev) => [normalizedEntry, ...prev]);
        setModules((prev) =>
          prev.map((module) =>
            module.id === selectedModuleId
              ? {
                  ...module,
                  ai_songs: [normalizedEntry, ...(module.ai_songs || [])],
                }
              : module
          )
        );
      }

      if (response?.pending_asset) {
        showToast('success', 'Song generated! It will appear after QC approval.');
      } else if (response?.song) {
        const song = response.song;
        setSongInfo({
          url: song.url || '',
          duration_seconds: song.duration_seconds || null,
          style: song.style || '',
          generated_at: song.generated_at || null,
        });
        showToast('success', 'Training song generated!');
      }
    } catch (error: any) {
      console.error('Song generation failed', error);
      showToast('error', error?.response?.data?.error || 'Failed to generate song.');
    } finally {
      setSongGenerating(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!selectedModuleId || isDraftModule) {
      showToast('error', 'Save the module before managing songs.');
      return;
    }
    const targetSong = songHistory.find((song) => song.id === songId);
    if (!targetSong) {
      showToast('error', 'Unable to locate that song.');
      return;
    }
    const confirmDelete =
      typeof window === 'undefined' ? true : window.confirm('Remove this song from the module?');
    if (!confirmDelete) return;

    setDeletingSongId(songId);
    try {
      const response = await aiAPI.deleteSong(songId);
      const replacement = response?.replacement_song;

      setSongHistory((prev) => prev.filter((song) => song.id !== songId));
      setModules((prev) =>
        prev.map((module) => {
          if (module.id !== selectedModuleId) return module;
          const filteredSongs = (module.ai_songs || []).filter((song) => song.id !== songId);
          const shouldClearCurrent = module.ai_song_url === targetSong.song_url;
          return {
            ...module,
            ai_songs: filteredSongs,
            ai_song_url: shouldClearCurrent ? replacement?.song_url || null : module.ai_song_url,
            ai_song_style: shouldClearCurrent ? replacement?.song_style || module.ai_song_style : module.ai_song_style,
            ai_song_duration_seconds: shouldClearCurrent
              ? replacement?.song_duration_seconds || module.ai_song_duration_seconds
              : module.ai_song_duration_seconds,
            ai_song_generated_at: shouldClearCurrent
              ? replacement?.created_at || module.ai_song_generated_at
              : module.ai_song_generated_at,
          };
        })
      );

      if (songInfo.url === targetSong.song_url) {
        if (replacement) {
          setSongInfo({
            url: replacement.song_url || '',
            duration_seconds: replacement.song_duration_seconds || null,
            style: replacement.song_style || '',
            generated_at: replacement.created_at || null,
          });
        } else {
          setSongInfo({
            url: '',
            duration_seconds: null,
            style: '',
            generated_at: null,
          });
        }
      }

      showToast('success', 'Song removed from the module.');
    } catch (error: any) {
      console.error('Failed to delete song', error);
      showToast('error', error?.response?.data?.error || 'Unable to remove song. Try again.');
    } finally {
      setDeletingSongId('');
    }
  };

  const handleSaveToModule = async () => {
    if (!isDraftModule && !selectedModuleId) {
      showToast('error', 'Select a training module to attach the AI assets.');
      return;
    }
    if (!isDraftModule && !currentModule) {
      showToast('error', 'Unable to locate that module. Reload the page and try again.');
      return;
    }

    const normalizedTitle = moduleMetaForm.title.trim();
    const normalizedCategory = moduleMetaForm.category.trim();
    const normalizedDescription = moduleMetaForm.description.trim();

    if (!normalizedTitle) {
      showToast('error', 'Add a module title before saving.');
      return;
    }

    const payload: Record<string, any> = {};
    const trimmedPolicy = policyText.trim();
    const trimmedEmphasis = emphasisPrompt.trim();
    if (trimmedPolicy) {
      payload.policy_summary_text = trimmedPolicy;
    }
    if (trimmedEmphasis) {
      payload.emphasis_prompt = trimmedEmphasis;
    }
    if (lyrics.trim()) {
      payload.ai_song_lyrics = lyrics.trim();
    }
    const reinforcement = overlayState.reinforcement.filter((item) => item.trim());
    const policyHighlights = overlayState.policy_highlights.filter((item) => item.trim());
    if (reinforcement.length || policyHighlights.length) {
      payload.ai_overlay_texts = {
        reinforcement,
        policy_highlights: policyHighlights,
        combined: [...reinforcement, ...policyHighlights],
      };
    }

    const currentTitle = (currentModule?.title || '').trim();
    const currentCategory = (currentModule?.category || '').trim();
    const currentDescription = (currentModule?.description || '').trim();

    if (isDraftModule || normalizedTitle !== currentTitle) {
      payload.title = normalizedTitle;
    }
    if (isDraftModule || normalizedCategory !== currentCategory) {
      payload.category = normalizedCategory || null;
    }
    if (isDraftModule || normalizedDescription !== currentDescription) {
      payload.description = normalizedDescription || null;
    }

    if (!Object.keys(payload).length && !policyFile) {
      showToast('error', 'Nothing to save yet. Update a field or attach a policy PDF.');
      return;
    }

    setSaving(true);
    setSaveAction(isDraftModule ? 'create' : 'save');
    try {
      let response;
      let targetModuleId = selectedModuleId;
      if (isDraftModule) {
        response = await trainingModulesAPI.create(payload);
        targetModuleId = response?.training_module?.id || '';
      } else {
        response = await trainingModulesAPI.update(selectedModuleId, payload);
      }
      const updatedModule = response?.training_module;
      if (policyFile && targetModuleId) {
        await trainingModulesAPI.uploadPolicy(targetModuleId, policyFile);
      }
      if (updatedModule) {
        setModules((prev) => {
          const exists = prev.some((module) => module.id === updatedModule.id);
          if (exists) {
            return prev.map((module) => (module.id === updatedModule.id ? updatedModule : module));
          }
          return [...prev, updatedModule];
        });
        applyModuleToWorkspace(updatedModule);
        setIsDraftModule(false);
        setModuleToLoadId(updatedModule.id);
      }
      showToast('success', isDraftModule ? 'Module created and saved.' : 'Module saved.');
    } catch (error: any) {
      console.error('Failed to save AI content', error);
      showToast('error', error?.response?.data?.error || 'Unable to save AI content.');
    } finally {
      setSaving(false);
      setSaveAction(null);
    }
  };

  const handleStartNewModule = () => {
    resetWorkspace();
    setModuleMetaForm(initialModuleMeta);
    setSelectedModuleId('');
    setModuleToLoadId('');
    setIsDraftModule(true);
    setActiveTab('policy-upload');
    showToast('success', 'Draft started. Add details and click Save to publish the module.');
  };

  const resetWorkspace = useCallback(() => {
    setPolicyFile(null);
    setPolicyText('');
    setEmphasisPrompt('');
    setLyrics('');
    setLyricsUsage('');
    setOverlayState(defaultOverlay());
    setOverlayUsage('');
    setSongInfo({
      url: '',
      duration_seconds: null,
      style: '',
      generated_at: null,
    });
    setSongHistory([]);
    setDeletingSongId('');
    setSongGenerating(false);
  }, []);

  const handleModuleMetaChange = (field: keyof ModuleMetaForm, value: string) => {
    setModuleMetaForm((prev) => ({ ...prev, [field]: value }));
  };

  const addOverlayItem = (type: 'reinforcement' | 'policy_highlights') => {
    setOverlayState((prev) => ({
      ...prev,
      [type]: [...prev[type], ''],
    }));
  };

  const updateOverlayItem = (
    type: 'reinforcement' | 'policy_highlights',
    index: number,
    value: string
  ) => {
    setOverlayState((prev) => {
      const clone = [...prev[type]];
      clone[index] = value;
      return { ...prev, [type]: clone };
    });
  };

  const handleTabChange = (tabId: string) => {
    if (!selectedModuleId && !isDraftModule && MODULE_REQUIRED_TABS.has(tabId)) {
      showToast('warning', 'Load or create a training module to use this tab.');
      return;
    }
    setActiveTab(tabId);
  };

  const handleNextFromPolicy = () => {
    setActiveTab('lyrics-generator');
  };

  const handleQuizStatusChange = useCallback(
    (moduleId: string, hasQuestions: boolean) => {
      if (!moduleId || moduleId !== selectedModuleId) {
        return;
      }
      setQuizHasQuestions(hasQuestions);
    },
    [selectedModuleId]
  );

  const markPendingAssetCleared = useCallback((assetId?: string | null) => {
    if (!assetId) return;
    setClearedPendingAssets((prev) => {
      if (prev.has(assetId)) return prev;
      const next = new Set(prev);
      next.add(assetId);
      return next;
    });
  }, []);

  const handlePendingAssetResolved = useCallback(
    (assetId?: string | null) => {
      if (assetId) {
        markPendingAssetCleared(assetId);
      }
      setQcRefreshToken((token) => token + 1);
    },
    [markPendingAssetCleared]
  );

  const hasContent = policyText.trim().length > 0 ||
    emphasisPrompt.trim().length > 0 ||
    lyrics.trim().length > 0 ||
    overlayState.reinforcement.some(p => p.trim()) ||
    overlayState.policy_highlights.some(p => p.trim()) ||
    !!songInfo.url;
  const shouldShowMetaForm = Boolean(selectedModuleId || isDraftModule);
  const metaChanged = useMemo(() => {
    const normalize = (value?: string | null) => (value || '').trim();
    if (isDraftModule) {
      return (
        normalize(moduleMetaForm.title).length > 0 ||
        normalize(moduleMetaForm.category).length > 0 ||
        normalize(moduleMetaForm.description).length > 0
      );
    }
    if (!selectedModuleId || !currentModule) return false;
    return (
      normalize(moduleMetaForm.title) !== normalize(currentModule.title) ||
      normalize(moduleMetaForm.category) !== normalize(currentModule.category) ||
      normalize(moduleMetaForm.description) !== normalize(currentModule.description)
    );
  }, [isDraftModule, selectedModuleId, currentModule, moduleMetaForm]);
  const canSaveModule =
    (isDraftModule || Boolean(selectedModuleId)) && (hasContent || metaChanged || Boolean(policyFile));

  const renderTabContent = () => {
    if (!selectedModuleId && !isDraftModule && MODULE_REQUIRED_TABS.has(activeTab)) {
      return (
        <div className="px-4 py-12">
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Load or create a training module</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              AI Studio unlocks as soon as you load an existing module or create a new one using the controls above.
              Your drafts auto-save locally, but nothing publishes to a module until you click <span className="font-semibold text-primary-600">Save Module</span>.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'policy-upload':
        return (
          <PolicyUploadTab
            policyFile={policyFile}
            policyText={policyText}
            emphasisPrompt={emphasisPrompt}
            onPolicyFileChange={setPolicyFile}
            onPolicyTextChange={setPolicyText}
            onEmphasisPromptChange={setEmphasisPrompt}
            onNext={handleNextFromPolicy}
          />
        );

      case 'lyrics-generator':
        return (
          <LyricsGeneratorTab
            lyrics={lyrics}
            loading={lyricsLoading}
            usage={lyricsUsage}
            onLyricsChange={setLyrics}
            onGenerate={handleGenerateLyrics}
            onSaveDraft={saveDraft}
          />
        );

      case 'reminder-phrases':
        return (
          <ReminderPhrasesTab
            reinforcement={overlayState.reinforcement}
            policyHighlights={overlayState.policy_highlights}
            loading={overlayLoading}
            usage={overlayUsage}
            onReinforcementChange={(index, value) =>
              updateOverlayItem('reinforcement', index, value)
            }
            onPolicyHighlightChange={(index, value) =>
              updateOverlayItem('policy_highlights', index, value)
            }
            onAddReinforcement={() => addOverlayItem('reinforcement')}
            onAddPolicyHighlight={() => addOverlayItem('policy_highlights')}
            onGenerate={handleGenerateOverlays}
            onClearAll={() => setOverlayState(defaultOverlay())}
          />
        );

      case 'song-generator':
        return (
          <SongGeneratorTab
            moduleId={isDraftModule ? '' : selectedModuleId}
            lyrics={lyrics}
            emphasisPrompt={emphasisPrompt}
            reinforcement={overlayState.reinforcement}
            policyHighlights={overlayState.policy_highlights}
            generating={songGenerating}
            songs={songHistory}
            onDeleteSong={handleDeleteSong}
            deletingSongId={deletingSongId}
            onGenerate={handleGenerateSong}
            onShowToast={showToast}
            onModuleRefresh={handleModuleRefresh}
            isDraft={isDraftModule}
            onPendingAssetResolved={handlePendingAssetResolved}
          />
        );

      case 'image-generation':
        return (
          <ImageGenerationTab
            selectedModuleId={!isDraftModule && selectedModuleId ? selectedModuleId : null}
            policyText={policyText}
            lyrics={lyrics}
            reminderPhrases={[...overlayState.reinforcement, ...overlayState.policy_highlights]}
            onShowToast={showToast}
          />
        );
      case 'image-to-video':
        return (
          <ImageToVideoTab
            selectedModuleId={!isDraftModule && selectedModuleId ? selectedModuleId : null}
            onShowToast={showToast}
          />
        );
      case 'quiz-builder':
        return (
          <QuizBuilderTab
            modules={moduleOptions}
            activeModuleId={!isDraftModule && selectedModuleId ? selectedModuleId : undefined}
            policyFile={policyFile}
            policyText={policyText}
            lyrics={lyrics}
            reinforcementPhrases={overlayState.reinforcement}
            policyHighlights={overlayState.policy_highlights}
            onShowToast={showToast}
            onQuestionStatusChange={handleQuizStatusChange}
          />
        );
      case 'asset-repository':
        return (
          <AssetRepositoryTab
            modules={moduleOptions}
            onShowToast={showToast}
            onModuleRefresh={handleModuleRefresh}
          />
        );
      case 'qc-queue':
        return (
          <QcQueueTab
            onShowToast={showToast}
            onModuleRefresh={handleModuleRefresh}
            refreshToken={qcRefreshToken}
            hiddenAssetIds={clearedPendingAssets}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-primary-600 font-semibold mb-2">
                AI Authoring
              </p>
              <h1 className="text-4xl font-extrabold text-gray-900">AI Studio</h1>
              <p className="text-gray-600 mt-2 max-w-3xl">
                Create engaging training content with AI. Upload policies, generate song lyrics,
                create reminder phrases, and save everything to your training modules.
              </p>

              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">
                      Load existing module content
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={moduleToLoadId}
                        onChange={(event) => setModuleToLoadId(event.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      >
                        <option value="">Select a module…</option>
                        {moduleOptions.map((module) => (
                          <option key={module.id} value={module.id}>
                            {module.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLoadModuleAssets}
                        disabled={!moduleToLoadId}
                        className="inline-flex items-center justify-center rounded-xl bg-white border border-primary-100 px-4 py-3 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Load module
                      </button>
                      <button
                        type="button"
                        onClick={handleStartNewModule}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 text-sm font-semibold text-white shadow hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        New module
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Loading pulls the module&apos;s saved policy summary, emphasis prompt, lyrics, reminder phrases, and songs into this workspace.
                    </p>
                  </div>
                </div>

                {shouldShowMetaForm && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Module Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={moduleMetaForm.title}
                          onChange={(event) => handleModuleMetaChange('title', event.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                          placeholder="Example: Risk Management Basics"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category
                        </label>
                        <input
                          type="text"
                          value={moduleMetaForm.category}
                          onChange={(event) => handleModuleMetaChange('category', event.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                          placeholder="Compliance, Safety, Sales…"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={moduleMetaForm.description}
                        onChange={(event) => handleModuleMetaChange('description', event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                        placeholder="Brief summary of what this training module covers."
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveToModule}
                    disabled={!canSaveModule || saving}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 text-sm font-semibold text-white shadow hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveAction === 'save' ? 'Saving…' : 'Save module'}
                  </button>
                  <p className="text-xs text-gray-500">
                    Drafts auto-save locally every 30 seconds. Nothing is published until you press Save.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        completedTabs={completedTabs}
        disabledTabIds={!selectedModuleId && !isDraftModule ? Array.from(MODULE_REQUIRED_TABS) : []}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className="container mx-auto px-4 pt-6">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Tab Content */}
      <div className="container mx-auto pb-12">
        {renderTabContent()}
      </div>
    </div>
  );
}
