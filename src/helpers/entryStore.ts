import { App, TFile, EventRef, CachedMetadata } from 'obsidian';
import { Entry, PluginSettings } from '../types';
import { parseDate, parseDurationMinutes } from './dateUtil';
import { extractRequirements, normalizeTags } from './parsing';

type Listener = () => void;

export class EntryStore {
	app: App;
	settings: PluginSettings;
	private entries: Entry[] = [];
	private listeners: Set<Listener> = new Set();
	private vaultEvents: EventRef[] = [];
	private metaEvents: EventRef[] = [];
	private rebuildTimer: number | null = null;

	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	start(): void {
		this.rebuild();
		// Watch for vault changes
		this.vaultEvents.push(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === 'md') this.scheduleRebuild();
			}),
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') this.scheduleRebuild();
			}),
			this.app.vault.on('rename', (file) => {
				if (file instanceof TFile && file.extension === 'md') this.scheduleRebuild();
			}),
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') this.scheduleRebuild();
			}),
		);
		this.metaEvents.push(
			this.app.metadataCache.on('changed', () => this.scheduleRebuild()),
		);
	}

	stop(): void {
		for (const e of this.vaultEvents) this.app.vault.offref(e);
		for (const e of this.metaEvents) this.app.metadataCache.offref(e);
		this.vaultEvents = [];
		this.metaEvents = [];
		if (this.rebuildTimer) {
			window.clearTimeout(this.rebuildTimer);
			this.rebuildTimer = null;
		}
	}

	updateSettings(settings: PluginSettings): void {
		this.settings = settings;
		this.scheduleRebuild();
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		for (const l of this.listeners) l();
	}

	private scheduleRebuild(): void {
		if (this.rebuildTimer) window.clearTimeout(this.rebuildTimer);
		this.rebuildTimer = window.setTimeout(async () => {
			this.rebuildTimer = null;
			await this.rebuild();
		}, 200);
	}

	getAll(): Entry[] {
		return this.entries;
	}

	getById(id: string): Entry | undefined {
		return this.entries.find(e => e.id === id);
	}

	getOnDay(day: Date): Entry[] {
		return this.entries
			.filter(e =>
				e.date.getFullYear() === day.getFullYear() &&
				e.date.getMonth() === day.getMonth() &&
				e.date.getDate() === day.getDate()
			)
			.sort(compareEntriesForDay);
	}

	allTagsWithCounts(): { tag: string; count: number }[] {
		const counts = new Map<string, number>();
		for (const e of this.entries) {
			for (const t of e.tags) {
				counts.set(t, (counts.get(t) ?? 0) + 1);
			}
		}
		return [...counts.entries()]
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => {
				if (b.count !== a.count) return b.count - a.count;
				return a.tag.localeCompare(b.tag);
			});
	}

	private async rebuild(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		const folder = (this.settings.folderPath || '').trim();
		const filtered = folder
			? files.filter(f => f.path === folder || f.path.startsWith(folder + '/'))
			: files;

		const out: Entry[] = [];
		for (const file of filtered) {
			const cache = this.app.metadataCache.getFileCache(file);
			const entry = await this.buildEntry(file, cache);
			if (entry) out.push(entry);
		}
		out.sort((a, b) => a.date.getTime() - b.date.getTime());
		this.entries = out;
		this.notify();
	}

	private async buildEntry(file: TFile, cache: CachedMetadata | null): Promise<Entry | null> {
		const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

		// Extract date from configured field names
		let dateRaw: string | null = null;
		for (const field of this.settings.dateFieldNames) {
			const v = fm[field];
			if (v != null) { dateRaw = String(v); break; }
		}
		if (!dateRaw) return null;
		const parsed = parseDate(dateRaw);
		if (!parsed) return null;

		// End date: end / end_date / endDate, or duration
		let endDate: Date | null = null;
		const endRaw = fm['end'] ?? fm['end_date'] ?? fm['endDate'];
		if (endRaw != null) {
			const ep = parseDate(String(endRaw));
			if (ep) endDate = ep.date;
		}
		if (!endDate && fm['duration'] != null) {
			const mins = parseDurationMinutes(String(fm['duration']));
			if (mins != null) {
				endDate = new Date(parsed.date.getTime() + mins * 60000);
			}
		}
		if (endDate && endDate <= parsed.date) endDate = null;

		// Tags
		const fmTags = normalizeTags(fm['tags'] as string | string[] | undefined);
		// Also pick up Obsidian-style #tags from cache
		const inlineTags = (cache?.tags ?? []).map(t => t.tag.replace(/^#/, ''));
		const allTags = Array.from(new Set([...fmTags, ...inlineTags]));

		const title = (typeof fm['title'] === 'string' && fm['title'])
			? String(fm['title'])
			: file.basename;

		// Read body. Slice off the front matter block from the raw text.
		const raw = await this.app.vault.cachedRead(file);
		const bodyOnly = stripFrontMatter(raw);
		const { items: requirements, bodyWithout } = extractRequirements(
			bodyOnly,
			this.settings.requirementsHeadings
		);

		// Stringify front matter values for the Entry's frontMatter field (we store
		// strings throughout for consistency).
		const fmStr: Record<string, string> = {};
		for (const k of Object.keys(fm)) {
			const v = fm[k];
			fmStr[k] = Array.isArray(v) ? `[${v.join(', ')}]` : String(v);
		}

		return {
			id: file.path,
			file,
			title,
			date: parsed.date,
			endDate,
			hasTime: parsed.hasTime,
			tags: allTags,
			body: bodyWithout,
			bodyFull: bodyOnly,
			requirements,
			frontMatter: fmStr,
			mtime: file.stat.mtime,
		};
	}
}

function stripFrontMatter(text: string): string {
	if (!text.startsWith('---')) return text;
	const end = text.indexOf('\n---', 3);
	if (end === -1) return text;
	const after = text.slice(end + 4);
	return after.startsWith('\n') ? after.slice(1) : after;
}

export function compareEntriesForDay(a: Entry, b: Entry): number {
	if (a.hasTime !== b.hasTime) return a.hasTime ? 1 : -1;
	if (a.hasTime) {
		const dt = a.date.getTime() - b.date.getTime();
		if (dt !== 0) return dt;
	}
	return a.title.localeCompare(b.title);
}
