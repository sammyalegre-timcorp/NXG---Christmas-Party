import React, { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  Gift,
  Image as ImageIcon,
  Link as LinkIcon,
  ListOrdered,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { AdminDataResponse, Poll, PollOption } from '../types.ts';
import {
  fetchAdminDataDirect,
  directSavePoll,
  directDeletePoll,
  directSaveConfig,
  directClearAllVotes,
} from '../clientDirectFirestore.ts';

const PHOTO_PRESETS = [
  { label: '📱 Tablet', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80' },
  { label: '📺 Smart TV', url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80' },
  { label: '🛍️ Shopping', url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80' },
  { label: '💇 Styler', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80' },
  { label: '🎮 Console', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80' },
  { label: '🍖 Hamper', url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=600&auto=format&fit=crop&q=80' },
  { label: '🎧 Audio', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
  { label: '☕ Espresso', url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80' },
  { label: '🎁 Gift Box', url: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80' },
];

interface AdminDashboardProps {
  onNavigateToMain: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToMain }) => {
  const [data, setData] = useState<AdminDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tallies' | 'entries' | 'manage' | 'settings'>('tallies');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Poll editing/creating state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollCategory, setPollCategory] = useState('');
  const [pollOptions, setPollOptions] = useState<
    Array<{ id?: string; text: string; description: string; badge: string; imageUrl?: string }>
  >([
    { text: '', description: '', badge: '', imageUrl: '' },
    { text: '', description: '', badge: '', imageUrl: '' },
  ]);

  // Settings state
  const [deadlineInput, setDeadlineInput] = useState('');
  const [deadlineLabelInput, setDeadlineLabelInput] = useState('');
  const [eventTitleInput, setEventTitleInput] = useState('');

  // Clear votes modal
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      let json: AdminDataResponse | null = null;

      try {
        const res = await fetch('/api/admin/data');
        if (res.ok) {
          const text = await res.text();
          try {
            json = JSON.parse(text);
          } catch (e) {}
        }
      } catch (apiErr) {
        console.warn('API /api/admin/data call failed, falling back to direct Firestore:', apiErr);
      }

      // If backend API returned non-JSON or failed (e.g. static Vercel deployment), query Firestore directly
      if (!json) {
        json = await fetchAdminDataDirect();
      }

      if (json) {
        setData(json);
        setDeadlineInput(json.config.deadlinePST);
        setDeadlineLabelInput(json.config.deadlineLabel);
        setEventTitleInput(json.config.eventTitle);
      }
    } catch (err: any) {
      console.error(err);
      showMessage(err.message || 'Failed to connect to admin data store', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingPollId(null);
    setPollTitle('');
    setPollDescription('');
    setPollCategory('Giveaway');
    setPollOptions([
      { text: '', description: '', badge: '', imageUrl: '' },
      { text: '', description: '', badge: '', imageUrl: '' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (poll: Poll) => {
    setEditingPollId(poll.id);
    setPollTitle(poll.title);
    setPollDescription(poll.description || '');
    setPollCategory(poll.category || 'Giveaway');
    setPollOptions(
      poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        description: o.description || '',
        badge: o.badge || '',
        imageUrl: o.imageUrl || '',
      }))
    );
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (file: File, optionIndex: number) => {
    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file (PNG, JPG, WEBP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const next = [...pollOptions];
          next[optionIndex] = { ...next[optionIndex], imageUrl: dataUrl };
          setPollOptions(next);
          showMessage('Photo uploaded and attached!');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim()) {
      showMessage('Please enter a poll title', 'error');
      return;
    }

    const cleanOptions = pollOptions
      .map((o) => ({
        id: o.id,
        text: o.text.trim(),
        description: o.description.trim(),
        badge: o.badge.trim(),
        imageUrl: (o.imageUrl || '').trim(),
      }))
      .filter((o) => o.text.length > 0);

    if (cleanOptions.length < 2) {
      showMessage('Each poll requires at least 2 non-empty options', 'error');
      return;
    }

    try {
      let saved = false;

      if (editingPollId) {
        try {
          const res = await fetch(`/api/admin/polls/${editingPollId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pollTitle,
              description: pollDescription,
              category: pollCategory,
              options: cleanOptions,
            }),
          });
          if (res.ok) saved = true;
        } catch (e) {}

        if (!saved) {
          const existingPoll = data?.polls.find((p) => p.id === editingPollId);
          await directSavePoll({
            id: editingPollId,
            title: pollTitle.trim(),
            description: pollDescription.trim(),
            category: pollCategory.trim() || 'Giveaway',
            order: existingPoll?.order || 1,
            active: existingPoll?.active ?? true,
            createdAt: existingPoll?.createdAt || new Date().toISOString(),
            options: cleanOptions.map((opt, idx) => ({
              id: opt.id || 'opt-' + Date.now() + '-' + (idx + 1),
              text: opt.text.trim(),
              description: opt.description.trim(),
              badge: opt.badge.trim(),
              imageUrl: opt.imageUrl?.trim() || '',
            })),
          });
        }
        showMessage('Poll successfully updated!');
      } else {
        const newPollId = 'poll-' + Date.now();
        try {
          const res = await fetch('/api/admin/polls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pollTitle,
              description: pollDescription,
              category: pollCategory,
              options: cleanOptions,
            }),
          });
          if (res.ok) saved = true;
        } catch (e) {}

        if (!saved) {
          await directSavePoll({
            id: newPollId,
            title: pollTitle.trim(),
            description: pollDescription.trim(),
            category: pollCategory.trim() || 'Giveaway',
            order: (data?.polls.length || 0) + 1,
            active: true,
            createdAt: new Date().toISOString(),
            options: cleanOptions.map((opt, idx) => ({
              id: opt.id || 'opt-' + Date.now() + '-' + (idx + 1),
              text: opt.text.trim(),
              description: opt.description.trim(),
              badge: opt.badge.trim(),
              imageUrl: opt.imageUrl?.trim() || '',
            })),
          });
        }
        showMessage('New Christmas poll successfully added!');
      }

      setIsModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      showMessage(err.message || 'Error saving poll', 'error');
    }
  };

  const handleDeletePoll = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the poll: "${title}"?`)) return;
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/admin/polls/${id}`, { method: 'DELETE' });
        if (res.ok) deleted = true;
      } catch (e) {}

      if (!deleted) {
        await directDeletePoll(id);
      }
      showMessage('Poll deleted');
      fetchAdminData();
    } catch (err: any) {
      showMessage(err.message || 'Error deleting poll', 'error');
    }
  };

  const handleTogglePollActive = async (poll: Poll) => {
    try {
      let toggled = false;
      try {
        const res = await fetch(`/api/admin/polls/${poll.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !poll.active }),
        });
        if (res.ok) toggled = true;
      } catch (e) {}

      if (!toggled) {
        await directSavePoll({ ...poll, active: !poll.active });
      }
      fetchAdminData();
    } catch (err: any) {
      showMessage(err.message || 'Error toggling poll status', 'error');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let saved = false;
      const updatedConfig = {
        ...(data?.config || {
          deadlinePST: '2026-09-18T18:00:00+08:00',
          deadlineLabel: 'September 18, 6:00 PM PST',
          eventTitle: 'Christmas Giveaway Poll',
          eventSubtitle: 'Vote for your preferred Christmas giveaway item. Choose one option below!',
          companyName: 'Holiday Cheer Committee',
        }),
        deadlinePST: deadlineInput,
        deadlineLabel: deadlineLabelInput,
        eventTitle: eventTitleInput,
      };

      try {
        const res = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig),
        });
        if (res.ok) saved = true;
      } catch (e) {}

      if (!saved) {
        await directSaveConfig(updatedConfig);
      }
      showMessage('Countdown settings updated successfully!');
      fetchAdminData();
    } catch (err: any) {
      showMessage(err.message || 'Error updating settings', 'error');
    }
  };

  const handleClearAllVotes = async () => {
    try {
      let cleared = false;
      try {
        const res = await fetch('/api/admin/clear-votes', { method: 'POST' });
        if (res.ok) cleared = true;
      } catch (e) {}

      if (!cleared && data?.voters) {
        await directClearAllVotes(data.voters.map((v) => v.id));
      }
      setShowClearModal(false);
      showMessage('All votes have been cleared for a fresh ballot count!');
      fetchAdminData();
    } catch (err: any) {
      showMessage(err.message || 'Error clearing votes', 'error');
    }
  };

  const escapeCsv = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const handleDownloadEntriesCSV = () => {
    if (!data?.voters || data.voters.length === 0) {
      showMessage('No voter entries recorded yet to export.', 'error');
      return;
    }
    const BOM = '\uFEFF';
    const isSinglePoll = data.polls.length === 1;
    const headerRow = isSinglePoll
      ? ['Voter Name', 'Submission Timestamp (PST / UTC+8)', 'Selected Giveaway Option', 'Option Tag/Badge']
      : ['Voter Name', 'Submission Timestamp (PST / UTC+8)', ...data.polls.map((p) => p.title)];

    const rows: string[] = [headerRow.map(escapeCsv).join(',')];

    data.voters.forEach((v) => {
      let pstDate = v.timestamp;
      try {
        pstDate =
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).format(new Date(v.timestamp)) + ' PST';
      } catch (e) {}

      if (isSinglePoll) {
        const singlePoll = data.polls[0];
        const selectedOptId = v.votes[singlePoll.id];
        const opt = singlePoll.options.find((o) => o.id === selectedOptId);
        rows.push([v.voterName, pstDate, opt ? opt.text : selectedOptId || 'None', opt?.badge || ''].map(escapeCsv).join(','));
      } else {
        const answers = data.polls.map((p) => {
          const selectedOptId = v.votes[p.id];
          const opt = p.options.find((o) => o.id === selectedOptId);
          return opt ? opt.text : selectedOptId || 'None';
        });
        rows.push([v.voterName, pstDate, ...answers].map(escapeCsv).join(','));
      }
    });

    const blob = new Blob([BOM + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `christmas-giveaway-entries-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Individual entries CSV downloaded successfully!');
  };

  const handleDownloadTalliesCSV = () => {
    if (!data?.tallies || data.tallies.length === 0) {
      showMessage('No tallies available to export yet.', 'error');
      return;
    }
    const BOM = '\uFEFF';
    const headerRow = ['Poll Title', 'Poll Category', 'Option Text', 'Tag/Badge', 'Vote Count', 'Percentage (%)', 'Total Poll Votes'];
    const rows: string[] = [headerRow.map(escapeCsv).join(',')];

    data.tallies.forEach((tally) => {
      const poll = data.polls.find((p) => p.id === tally.pollId);
      const category = poll?.category || 'General';

      tally.options.forEach((opt) => {
        rows.push(
          [tally.pollTitle, category, opt.text, opt.badge || '', opt.count, `${opt.percentage}%`, tally.totalVotes]
            .map(escapeCsv)
            .join(',')
        );
      });
    });

    const blob = new Blob([BOM + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `christmas-giveaway-tallies-summary-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Tallies summary CSV downloaded successfully!');
  };

  const filteredVoters = (data?.voters || []).filter((v) =>
    v.voterName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-[#0a1511] text-slate-100 pb-20">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#0c1c15]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-tr from-red-600 to-amber-500 shadow-md">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg font-bold text-white sm:text-xl">
                  Christmas Poll Admin
                </h1>
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                  Secret Admin Portal
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">
                Official Giveaway Tallies, Entries &amp; Poll Management
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              title="Refresh Data"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-800 bg-[#12281e] px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-amber-400/50 hover:bg-[#183629]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <a
              href="/api/admin/export-csv"
              download
              className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-600 to-amber-500 px-3.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={onNavigateToMain}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700/60 bg-[#12281e] px-3.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-900/50 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Exit to Voter View</span>
            </button>
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`mx-auto mt-4 max-w-5xl px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between shadow-lg ${
            actionMessage.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Statistics Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#12281e] to-[#0e1f18] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Total Unique Voters
              </span>
              <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400 border border-amber-400/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-mono text-3xl font-black text-amber-300">
              {data?.totalUniqueVoters ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Unique ballots cast by name
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-[#12281e] to-[#0e1f18] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Active Polls
              </span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                <ListOrdered className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-mono text-3xl font-black text-white">
              {data?.polls.filter((p) => p.active).length ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Visible on the main voting page
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-[#1e1315] to-[#140c0e] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-300">
                Deadline Target
              </span>
              <div className="rounded-lg bg-red-500/10 p-2 text-red-400 border border-red-500/20">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-serif text-lg font-bold text-red-200 truncate">
              Sept 18, 6:00 PM
            </div>
            <p className="mt-1 text-[11px] text-red-300/80">
              Philippine Standard Time (UTC+8)
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#12281e] to-[#0e1f18] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Data Exports
              </span>
              <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400 border border-amber-400/20">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadEntriesCSV}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 hover:bg-amber-400/30 cursor-pointer"
                title="Download Individual Ballot Entries CSV"
              >
                Entries CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadTalliesCSV}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
                title="Download Overall Tallies Summary CSV"
              >
                Tallies CSV
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Direct download formatted for Excel
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('tallies')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'tallies'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-[#12281e] text-slate-300 hover:bg-[#183629] hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Overall Tallies</span>
            </button>

            <button
              onClick={() => setActiveTab('entries')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'entries'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-[#12281e] text-slate-300 hover:bg-[#183629] hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Individual Entries ({data?.voters.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'manage'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-[#12281e] text-slate-300 hover:bg-[#183629] hover:text-white'
              }`}
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit &amp; Add Options ({data?.polls[0]?.options.length ?? data?.polls.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-[#12281e] text-slate-300 hover:bg-[#183629] hover:text-white'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings &amp; Deadline</span>
            </button>
          </div>

          {activeTab === 'manage' && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Add New Poll</span>
            </button>
          )}
        </div>

        {/* TAB 1: OVERALL TALLIES */}
        {activeTab === 'tallies' && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-white">
                  Current Christmas Giveaway Tallies
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time vote counts and percentages for each option (hidden from public voters).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/admin/export-summary-csv"
                  download
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-[#12281e] px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-[#183629]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
                  <span>Download Tallies CSV</span>
                </a>
              </div>
            </div>

            {data?.tallies.map((tally, pollIdx) => {
              const poll = data.polls.find((p) => p.id === tally.pollId);
              // Find the leading count
              const maxCount = Math.max(...tally.options.map((o) => o.count), 0);

              return (
                <div
                  key={tally.pollId}
                  className="rounded-2xl border border-emerald-800/60 bg-[#11241c] p-5 shadow-xl sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/40 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/30 text-xs font-bold text-red-300 border border-red-500/40">
                          {pollIdx + 1}
                        </span>
                        <span className="rounded-md bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-800">
                          {poll?.category || 'Category'}
                        </span>
                        {!poll?.active && (
                          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-serif text-lg font-bold text-white">
                        {tally.pollTitle}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-amber-300">
                        {tally.totalVotes}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">total votes</span>
                    </div>
                  </div>

                  {/* Options Bars */}
                  <div className="mt-5 space-y-3.5">
                    {tally.options.map((opt) => {
                      const isLeading = maxCount > 0 && opt.count === maxCount;

                      return (
                        <div
                          key={opt.id}
                          className="rounded-xl border border-emerald-900/60 bg-[#0d1c15] p-3.5"
                        >
                          <div className="flex items-center gap-3">
                            {opt.imageUrl && (
                              <img
                                src={opt.imageUrl}
                                alt={opt.text}
                                className="h-12 w-12 shrink-0 rounded-lg object-cover border border-emerald-800 bg-[#06110a]"
                                referrerPolicy="no-referrer"
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-100">
                                    {opt.text}
                                  </span>
                                  {opt.badge && (
                                    <span className="rounded-full bg-emerald-900/60 px-2 py-0.2 text-[10px] font-bold text-emerald-300 border border-emerald-700/50">
                                      {opt.badge}
                                    </span>
                                  )}
                                  {isLeading && (
                                    <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                                      <Award className="h-3 w-3" />
                                      Leading
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-bold text-amber-300">
                                    {opt.count} votes
                                  </span>
                                  <span className="w-12 text-right font-mono text-xs font-semibold text-slate-400">
                                    {opt.percentage}%
                                  </span>
                                </div>
                              </div>

                              {/* Visual Progress Bar */}
                              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-emerald-950/80 border border-emerald-900/40">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLeading
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                      : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                  }`}
                                  style={{ width: `${Math.max(opt.percentage, 0)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: INDIVIDUAL VOTER ENTRIES */}
        {activeTab === 'entries' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-white">
                  Individual Voter Submissions
                </h2>
                <p className="text-xs text-slate-400">
                  Detailed audit of every cast ballot with voter identity and timestamps.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by voter name..."
                    className="h-9 w-60 rounded-lg border border-emerald-800 bg-[#12281e] pl-9 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <a
                  href="/api/admin/export-csv"
                  download
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:bg-amber-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Entries CSV</span>
                </a>
              </div>
            </div>

            {filteredVoters.length === 0 ? (
              <div className="rounded-2xl border border-emerald-900/60 bg-[#11241c] p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  {searchQuery ? 'No voter matches your search' : 'No votes have been cast yet'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  When employees/participants vote on the main page, their selections will be listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-emerald-800/60 bg-[#11241c] shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-emerald-800/60 bg-[#0c1c15] text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    <tr>
                      <th className="py-3.5 pl-5 pr-3">#</th>
                      <th className="py-3.5 px-3">Voter Name</th>
                      <th className="py-3.5 px-3">Submitted Date (PST)</th>
                      {(data?.polls || []).map((poll) => (
                        <th key={poll.id} className="py-3.5 px-3 min-w-[200px]">
                          {data?.polls.length === 1 ? 'Selected Giveaway Option' : poll.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40 text-slate-200">
                    {filteredVoters.map((voter, index) => {
                      let formattedPst = '';
                      try {
                        formattedPst = new Intl.DateTimeFormat('en-US', {
                          timeZone: 'Asia/Manila',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        }).format(new Date(voter.timestamp));
                      } catch {
                        formattedPst = voter.timestamp;
                      }

                      return (
                        <tr key={voter.id} className="hover:bg-[#152e24]/60 transition-colors">
                          <td className="py-3 pl-5 pr-3 text-slate-400 font-mono">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 font-semibold text-amber-200">
                            {voter.voterName}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {formattedPst}
                          </td>
                          {(data?.polls || []).map((poll) => {
                            const choiceId = voter.votes[poll.id];
                            const opt = poll.options.find((o) => o.id === choiceId);
                            return (
                              <td key={poll.id} className="py-3 px-3 text-slate-300">
                                {opt ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-white">{opt.text}</span>
                                    {opt.badge && (
                                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] text-emerald-300 border border-emerald-800">
                                        {opt.badge}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAGE & EDIT POLLS */}
        {activeTab === 'manage' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-white">
                  Manage Christmas Giveaway Polls
                </h2>
                <p className="text-xs text-slate-400">
                  Add new questions, customize gift options, or edit visible polls on the main page.
                </p>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Add New Poll</span>
              </button>
            </div>

            <div className="space-y-4">
              {data?.polls.map((poll, idx) => (
                <div
                  key={poll.id}
                  className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                    poll.active
                      ? 'border-emerald-800/70 bg-[#11241c]'
                      : 'border-zinc-800 bg-[#0d1411] opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-emerald-300">
                          {idx + 1}
                        </span>
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-800">
                          {poll.category || 'General'}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            poll.active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {poll.active ? 'Visible on Main Page' : 'Hidden / Inactive'}
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-bold text-white">
                        {poll.title}
                      </h3>
                      {poll.description && (
                        <p className="text-xs text-slate-300/80">{poll.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePollActive(poll)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                          poll.active
                            ? 'border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700'
                            : 'border-emerald-700 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800/60'
                        }`}
                      >
                        {poll.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(poll)}
                        className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePoll(poll.id, poll.title)}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Options preview */}
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {poll.options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center gap-2.5 rounded-xl border border-emerald-900/50 bg-[#0c1813] p-2.5 text-xs"
                      >
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={opt.text}
                            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-emerald-800 bg-[#06110a]"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-100 truncate">{opt.text}</span>
                            {opt.badge && (
                              <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.description && (
                            <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & DEADLINE */}
        {activeTab === 'settings' && (
          <div className="mt-6 max-w-3xl space-y-8">
            <div>
              <h2 className="font-serif text-xl font-bold text-white">
                Countdown &amp; App Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure the countdown target and event information.
              </p>
            </div>

            {/* Countdown Settings Form */}
            <form onSubmit={handleSaveConfig} className="rounded-2xl border border-emerald-800/60 bg-[#11241c] p-6 shadow-xl space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Target Deadline (ISO or PST Date String)
                </label>
                <input
                  type="text"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  placeholder="2026-09-18T18:00:00+08:00"
                  className="mt-1.5 w-full rounded-xl border border-emerald-800 bg-[#0d1a14] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Standard format: <code>2026-09-18T18:00:00+08:00</code> (Sept 18, 6:00 PM PST / UTC+8).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Countdown Display Label
                </label>
                <input
                  type="text"
                  value={deadlineLabelInput}
                  onChange={(e) => setDeadlineLabelInput(e.target.value)}
                  placeholder="September 18, 6:00 PM PST (Philippine Standard Time)"
                  className="mt-1.5 w-full rounded-xl border border-emerald-800 bg-[#0d1a14] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventTitleInput}
                  onChange={(e) => setEventTitleInput(e.target.value)}
                  placeholder="Grand Christmas Giveaway 2026"
                  className="mt-1.5 w-full rounded-xl border border-emerald-800 bg-[#0d1a14] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-red-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  Save Settings
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6 space-y-3">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-serif text-base font-bold text-red-100">
                  Reset / Clear All Votes
                </h3>
              </div>
              <p className="text-xs text-red-200/80">
                Clear all voter ballots to prepare for official voting or discard test runs. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="rounded-xl border border-red-500/50 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                Clear All {data?.voters.length ?? 0} Votes
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create or Edit Poll */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-amber-400/40 bg-[#0f241a] shadow-2xl overflow-hidden">
            {/* Persistent Sticky Header */}
            <div className="flex items-center justify-between border-b border-emerald-800/60 bg-[#0f241a] px-6 py-4 shrink-0 z-10">
              <h3 className="font-serif text-lg font-bold text-white">
                {editingPollId ? 'Edit Christmas Poll' : 'Create New Christmas Poll'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-900/60 hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSavePoll} className="flex flex-1 flex-col overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-emerald-300">
                    Poll Question / Title *
                  </label>
                  <input
                    type="text"
                  required
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g. Choose your preferred Holiday Giveaway Gift"
                  className="mt-1 w-full rounded-xl border border-emerald-800 bg-[#0a1811] px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-emerald-300">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={pollCategory}
                    onChange={(e) => setPollCategory(e.target.value)}
                    placeholder="e.g. Grand Prize, Feast Hamper"
                    className="mt-1 w-full rounded-xl border border-emerald-800 bg-[#0a1811] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-emerald-300">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    placeholder="Brief instructions for voters"
                    className="mt-1 w-full rounded-xl border border-emerald-800 bg-[#0a1811] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Options Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-emerald-300">
                    Poll Choices / Giveaways ({pollOptions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPollOptions([...pollOptions, { text: '', description: '', badge: '' }])
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Option</span>
                  </button>
                </div>

                {pollOptions.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className="relative rounded-xl border border-emerald-800/60 bg-[#0a1711] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        Option #{oIdx + 1}
                      </span>
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPollOptions(pollOptions.filter((_, i) => i !== oIdx))
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[oIdx].text = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder="Option name (e.g. Smart 4K UHD TV)"
                      className="w-full rounded-lg border border-emerald-800 bg-[#07110c] px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={opt.badge}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[oIdx].badge = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder="Tag (e.g. Tech Prize, Gourmet)"
                        className="rounded-lg border border-emerald-800 bg-[#07110c] px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={opt.description}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[oIdx].description = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder="Detail / specs description"
                        className="rounded-lg border border-emerald-800 bg-[#07110c] px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Option Photo Attachment */}
                    <div className="rounded-lg border border-emerald-900/60 bg-[#07120c] p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                          <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                          <span>Option Photo</span>
                        </span>
                        {opt.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...pollOptions];
                              next[oIdx].imageUrl = '';
                              setPollOptions(next);
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove Photo</span>
                          </button>
                        )}
                      </div>

                      {opt.imageUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={opt.imageUrl}
                            alt="Option preview"
                            className="h-16 w-16 shrink-0 rounded-xl object-cover border border-emerald-700 bg-black/40 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="block text-[11px] font-medium text-emerald-400">
                              Photo Attached ✓
                            </span>
                            <p className="truncate text-[10px] text-slate-400">
                              {opt.imageUrl.startsWith('data:') ? 'Custom uploaded image file' : opt.imageUrl}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Drag and Drop / File upload input */}
                            <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-emerald-700/80 bg-[#091811] px-3 py-2 text-center text-[11px] text-emerald-200 transition-colors hover:border-amber-400/80 hover:bg-[#0f241a]">
                              <Upload className="h-3.5 w-3.5 text-amber-400" />
                              <span>Upload Photo File</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageFileUpload(file, oIdx);
                                }}
                                className="sr-only"
                              />
                            </label>

                            {/* Or paste direct URL */}
                            <div className="flex-[1.2] flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-[#050f0a] px-2.5 py-1.5">
                              <LinkIcon className="h-3 w-3 shrink-0 text-slate-400" />
                              <input
                                type="url"
                                value={opt.imageUrl || ''}
                                onChange={(e) => {
                                  const next = [...pollOptions];
                                  next[oIdx].imageUrl = e.target.value;
                                  setPollOptions(next);
                                }}
                                placeholder="Or paste image URL (https://...)"
                                className="w-full bg-transparent text-[11px] text-white placeholder-slate-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Quick Holiday Photo Presets */}
                          <div className="pt-1">
                            <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400">
                              <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                              <span>Quick Festive Photo Presets:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {PHOTO_PRESETS.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    const next = [...pollOptions];
                                    next[oIdx].imageUrl = preset.url;
                                    setPollOptions(next);
                                  }}
                                  className="rounded-md border border-emerald-800/80 bg-[#0b1f16] px-2 py-0.5 text-[10px] font-medium text-emerald-200 transition-colors hover:border-amber-400/60 hover:bg-emerald-900/60"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Persistent Sticky Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-emerald-800/60 bg-[#0c1c14] px-6 py-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-red-600 to-amber-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all"
                >
                  {editingPollId ? 'Update Poll' : 'Save New Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Clear All Votes */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-[#160b0d] p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/40">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-serif text-lg font-bold text-white">
              Clear All Votes?
            </h3>
            <p className="mt-2 text-xs text-red-200/80">
              This will permanently delete all {data?.voters.length ?? 0} recorded voter submissions and reset tallies back to zero.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllVotes}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 shadow-md shadow-red-950/50"
              >
                Yes, Reset All Votes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
