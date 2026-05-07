export function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear()
		&& a.getMonth() === b.getMonth()
		&& a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
	const d = startOfDay(date);
	const day = d.getDay();
	const diff = (day - weekStartsOn + 7) % 7;
	d.setDate(d.getDate() - diff);
	return d;
}

export function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export function formatTime(d: Date): string {
	return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDateForFrontMatter(date: Date, includeTime: boolean): string {
	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	if (!includeTime) return `${y}-${m}-${d}`;
	return `${y}-${m}-${d} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDate(value: string): { date: Date; hasTime: boolean } | null {
	if (!value) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;
	const hasTime = /\d{1,2}:\d{2}/.test(trimmed);

	const candidates = [trimmed, trimmed.replace(' ', 'T')];
	for (const c of candidates) {
		const d = new Date(c);
		if (!isNaN(d.getTime())) return { date: d, hasTime };
	}
	const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) {
		const [, a, b, y] = m;
		const d = new Date(`${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
		if (!isNaN(d.getTime())) return { date: d, hasTime: false };
	}
	return null;
}

export function parseDurationMinutes(s: string): number | null {
	const trimmed = s.trim();
	if (!trimmed) return null;
	if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
	const re = /(\d+(?:\.\d+)?)\s*(h(?:ours?|rs?)?|m(?:in(?:ute)?s?)?)/gi;
	let total = 0;
	let matched = false;
	let m: RegExpExecArray | null;
	while ((m = re.exec(trimmed)) !== null) {
		matched = true;
		const num = parseFloat(m[1]);
		const unit = m[2].toLowerCase();
		if (unit.startsWith('h')) total += num * 60;
		else total += num;
	}
	return matched ? total : null;
}

export function slugify(s: string): string {
	const slug = String(s)
		.toLowerCase()
		.trim()
		.replace(/['"]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return slug || 'entry';
}
