import { App, Modal, Notice, Setting, TFolder } from 'obsidian';
import TeachersPlannerPlugin from '../main';
import { slugify, formatDateForFrontMatter, pad } from '../helpers/dateUtil';
import { composeBodyWithRequirements, parseRequirementsList } from '../helpers/parsing';

export class NewEntryModal extends Modal {
	plugin: TeachersPlannerPlugin;
	initialDate: Date;

	titleVal = '';
	dateStr = '';
	timeStr = '';
	endTimeStr = '';
	tagsStr = '';
	subfolder = '';
	bodyVal = '';
	requirementsVal = '';
	repeatWeekly = false;
	repeatUntil = '';

	private occurrenceLabel: HTMLElement | null = null;
	private durationLabel: HTMLElement | null = null;

	constructor(app: App, plugin: TeachersPlannerPlugin, date: Date) {
		super(app);
		this.plugin = plugin;
		this.initialDate = date;
		this.dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		const until = new Date(date);
		until.setMonth(until.getMonth() + 3);
		this.repeatUntil = `${until.getFullYear()}-${pad(until.getMonth() + 1)}-${pad(until.getDate())}`;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mdcal-modal');
		contentEl.createEl('h2', { text: 'New entry' });

		new Setting(contentEl)
			.setName('Title')
			.addText(t => t
				.setPlaceholder('Meeting notes, journal, etc.')
				.onChange(v => this.titleVal = v));

		const dateRow = contentEl.createDiv({ cls: 'mdcal-modal-row' });
		this.makeField(dateRow, 'Date', () => {
			const inp = document.createElement('input');
			inp.type = 'date';
			inp.value = this.dateStr;
			inp.addEventListener('input', () => {
				this.dateStr = inp.value;
				this.updateOccurrenceLabel();
			});
			return inp;
		});
		this.makeField(dateRow, 'Start time', () => {
			const inp = document.createElement('input');
			inp.type = 'time';
			inp.value = '';
			inp.addEventListener('input', () => {
				this.timeStr = inp.value;
				this.updateDurationLabel();
			});
			return inp;
		});
		this.makeField(dateRow, 'End time', () => {
			const inp = document.createElement('input');
			inp.type = 'time';
			inp.value = '';
			inp.addEventListener('input', () => {
				this.endTimeStr = inp.value;
				this.updateDurationLabel();
			});
			return inp;
		});
		this.durationLabel = contentEl.createDiv({ cls: 'mdcal-modal-hint', text: 'Set start and end time to record duration.' });

		new Setting(contentEl)
			.setName('Tags')
			.setDesc('Comma-separated')
			.addText(t => t
				.setPlaceholder('work, meeting')
				.onChange(v => this.tagsStr = v));

		// Repeat
		new Setting(contentEl)
			.setName('Repeat weekly until')
			.addToggle(t => t.onChange(v => {
				this.repeatWeekly = v;
				if (this.occurrenceLabel) {
					this.occurrenceLabel.toggleClass('is-hidden', !v);
				}
				untilInput.disabled = !v;
				this.updateOccurrenceLabel();
			}))
			.addText(t => {
				t.setValue(this.repeatUntil)
					.onChange(v => {
						this.repeatUntil = v;
						this.updateOccurrenceLabel();
					});
				t.inputEl.type = 'date';
				t.inputEl.disabled = true;
				return t;
			});
		const untilInput = contentEl.querySelectorAll('input[type=date]')[1] as HTMLInputElement;
		this.occurrenceLabel = contentEl.createDiv({ cls: 'mdcal-modal-hint is-hidden' });

		// Subfolder
		const subfolders = this.collectSubfolders();
		new Setting(contentEl)
			.setName('Folder')
			.addDropdown(d => {
				for (const sub of subfolders) {
					d.addOption(sub, sub || '(default)');
				}
				d.onChange(v => this.subfolder = v);
			});

		new Setting(contentEl)
			.setName('Body (markdown)')
			.setDesc('')
			.addTextArea(t => {
				t.inputEl.rows = 6;
				t.onChange(v => this.bodyVal = v);
			});

		new Setting(contentEl)
			.setName('Requirements')
			.setDesc('One per line. Saved as ## Requirements section in the body.')
			.addTextArea(t => {
				t.inputEl.rows = 4;
				t.inputEl.placeholder = 'projector\nhandouts';
				t.onChange(v => this.requirementsVal = v);
			});

		const buttons = contentEl.createDiv({ cls: 'mdcal-modal-buttons' });
		const cancel = buttons.createEl('button', { text: 'Cancel' });
		cancel.addEventListener('click', () => this.close());
		const create = buttons.createEl('button', { text: 'Create entry', cls: 'mod-cta' });
		create.addEventListener('click', () => this.submit());
	}

	private updateOccurrenceLabel(): void {
		if (!this.occurrenceLabel) return;
		if (!this.repeatWeekly || !this.dateStr || !this.repeatUntil) {
			this.occurrenceLabel.setText('');
			return;
		}
		const start = new Date(`${this.dateStr}T00:00`);
		const until = new Date(`${this.repeatUntil}T23:59`);
		if (until < start) {
			this.occurrenceLabel.setText('End date must be on or after the start date');
			return;
		}
		let count = 0;
		let cursor = new Date(start);
		while (cursor <= until && count < 520) {
			count++;
			cursor.setDate(cursor.getDate() + 7);
		}
		const weekday = start.toLocaleDateString(undefined, { weekday: 'long' });
		this.occurrenceLabel.setText(`${count} occurrence${count === 1 ? '' : 's'} · every ${weekday}`);
	}

	private updateDurationLabel(): void {
		if (!this.durationLabel) return;
		if (!this.timeStr) {
			this.durationLabel.setText('Set a start time first to enable an end time.');
			return;
		}
		if (!this.endTimeStr) {
			this.durationLabel.setText('Add an end time to record duration.');
			return;
		}
		const [sh, sm] = this.timeStr.split(':').map(Number);
		const [eh, em] = this.endTimeStr.split(':').map(Number);
		let mins = (eh * 60 + em) - (sh * 60 + sm);
		let nextDay = false;
		if (mins <= 0) { mins += 24 * 60; nextDay = true; }
		const h = Math.floor(mins / 60), m = mins % 60;
		const parts: string[] = [];
		if (h) parts.push(`${h}h`);
		if (m) parts.push(`${m}m`);
		const dur = parts.join(' ') || '0m';
		this.durationLabel.setText(`Duration: ${dur}${nextDay ? ' (ends next day)' : ''}`);
	}

	private makeField(row: HTMLElement, label: string, builder: () => HTMLElement): void {
		const wrap = row.createDiv({ cls: 'mdcal-modal-field' });
		wrap.createEl('label', { text: label });
		wrap.appendChild(builder());
	}

	private collectSubfolders(): string[] {
		const root = this.plugin.settings.folderPath;
		const result = new Set<string>();
		result.add(root || '');
		const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder) as TFolder[];
		for (const f of folders) {
			if (!root || f.path === root || f.path.startsWith(root + '/')) {
				result.add(f.path);
			}
		}
		return [...result].sort();
	}

	private async submit(): Promise<void> {
		const title = this.titleVal.trim();
		if (!title) {
			new Notice('Title is required');
			return;
		}
		if (!this.dateStr) {
			new Notice('Date is required');
			return;
		}

		const includeTime = !!this.timeStr;
		const start = new Date(`${this.dateStr}T${this.timeStr || '00:00'}`);
		if (isNaN(start.getTime())) {
			new Notice('Invalid date/time');
			return;
		}

		let end: Date | null = null;
		if (includeTime && this.endTimeStr) {
			end = new Date(`${this.dateStr}T${this.endTimeStr}`);
			if (isNaN(end.getTime())) end = null;
			else if (end <= start) end.setDate(end.getDate() + 1);
		}

		const tags = this.tagsStr.split(',').map(t => t.trim()).filter(Boolean);
		const requirements = parseRequirementsList(this.requirementsVal);

		// Recurrence
		let occurrences: Date[] = [start];
		if (this.repeatWeekly && this.repeatUntil) {
			const until = new Date(`${this.repeatUntil}T23:59`);
			occurrences = [];
			let cursor = new Date(start);
			while (cursor <= until && occurrences.length < 520) {
				occurrences.push(new Date(cursor));
				cursor.setDate(cursor.getDate() + 7);
			}
		}

		const slug = slugify(title);
		let createdCount = 0;
		let firstPath: string | null = null;

		for (const occDate of occurrences) {
			let occEnd: Date | null = null;
			if (end) {
				occEnd = new Date(occDate.getTime() + (end.getTime() - start.getTime()));
			}
			const md = this.composeMarkdown(title, occDate, includeTime, occEnd, tags, requirements);
			const datePrefix = formatDateForFrontMatter(occDate, false);
			const filename = await this.findAvailablePath(`${datePrefix}-${slug}`);
			try {
				const created = await this.app.vault.create(filename, md);
				if (!firstPath) firstPath = created.path;
				createdCount++;
			} catch (e) {
				new Notice(`Failed to create file: ${(e as Error).message}`);
				return;
			}
		}

		new Notice(createdCount > 1 ? `Created ${createdCount} entries` : `Created ${firstPath}`);
		this.close();
	}

	private composeMarkdown(
		title: string,
		date: Date,
		includeTime: boolean,
		endDate: Date | null,
		tags: string[],
		requirements: string[]
	): string {
		const lines: string[] = ['---'];
		lines.push(`title: ${this.escapeYaml(title)}`);
		lines.push(`date: ${formatDateForFrontMatter(date, includeTime)}`);
		if (endDate && includeTime) {
			lines.push(`end: ${formatDateForFrontMatter(endDate, true)}`);
		}
		if (tags.length > 0) {
			lines.push(`tags: [${tags.map(t => this.escapeYaml(t)).join(', ')}]`);
		}
		lines.push('---');
		lines.push('');
		lines.push(composeBodyWithRequirements(this.bodyVal, requirements));
		return lines.join('\n');
	}

	private escapeYaml(s: string): string {
		if (/^[\s'"#&*!|>%@`]/.test(s) || /[:#]/.test(s) || s !== s.trim()) {
			return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
		}
		return s;
	}

	private async findAvailablePath(stem: string): Promise<string> {
		const folder = this.subfolder || this.plugin.settings.folderPath || '';
		const prefix = folder ? folder + '/' : '';
		let candidate = `${prefix}${stem}.md`;
		let n = 2;
		while (this.app.vault.getAbstractFileByPath(candidate)) {
			candidate = `${prefix}${stem}-${n}.md`;
			n++;
		}
		return candidate;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
