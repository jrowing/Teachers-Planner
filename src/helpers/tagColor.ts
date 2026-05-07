// Deterministic per-tag colors using a curated 24-slot palette plus per-tag
// jitter on top, so visually-similar tag names like "year-7" and "year-9"
// always get visibly different colors.

const PALETTE: [number, number, number][] = [
	[0, 0, 0], [15, 0, -2], [30, -3, -3], [45, -5, -5], [60, -8, -8], [75, -5, -5],
	[90, -3, -3], [110, -2, -2], [130, 0, 0], [150, 0, 0], [170, 0, 2], [190, 0, 4],
	[210, 2, 4], [225, 3, 4], [275, 4, 4], [290, 4, 3], [305, 3, 2], [320, 2, 0],
	[335, 0, 0], [350, 0, 0], [200, 1, 3], [240, 4, 3], [120, -1, -1], [160, 0, 0],
];

function imul(a: number, b: number): number {
	// Math.imul polyfill / explicit usage
	return Math.imul(a, b) >>> 0;
}

interface TagColors {
	bg: string;
	fg: string;
	border: string;
}

export function tagColors(tag: string, isDark: boolean): TagColors {
	const s = tag.toLowerCase();

	let h1 = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h1 ^= s.charCodeAt(i);
		h1 = imul(h1, 0x01000193);
	}
	let h2 = 5381;
	for (let i = s.length - 1; i >= 0; i--) {
		h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) >>> 0;
	}
	let mixed = (h1 ^ imul(h2, 0x9e3779b1)) >>> 0;
	mixed = imul(mixed ^ (mixed >>> 16), 0x85ebca6b);
	mixed = imul(mixed ^ (mixed >>> 13), 0xc2b2ae35);
	mixed = (mixed ^ (mixed >>> 16)) >>> 0;

	const slot = PALETTE[mixed % PALETTE.length];
	const [baseHue, lBoost, sBoost] = slot;
	const hueShift = ((h2 >>> 4) % 11) - 5;
	const satJitter = ((h2 >>> 12) % 9) - 4;
	const lightJitter = ((h2 >>> 20) % 7) - 3;
	const hue = (baseHue + hueShift + 360) % 360;

	if (isDark) {
		const bgSat = Math.max(20, 38 + sBoost + satJitter);
		const bgLight = Math.max(15, 24 + lBoost + lightJitter);
		const fgSat = Math.max(50, 70 + sBoost + satJitter);
		const fgLight = Math.min(90, 78 + lBoost + lightJitter);
		const bdSat = Math.max(20, 32 + sBoost + satJitter);
		const bdLight = Math.max(20, 34 + lBoost + lightJitter);
		return {
			bg: `hsl(${hue}, ${bgSat}%, ${bgLight}%)`,
			fg: `hsl(${hue}, ${fgSat}%, ${fgLight}%)`,
			border: `hsl(${hue}, ${bdSat}%, ${bdLight}%)`,
		};
	}
	const bgSat = Math.max(40, 72 + sBoost + satJitter);
	const bgLight = Math.min(96, 91 + lBoost + lightJitter);
	const fgSat = Math.max(35, 60 + sBoost + satJitter);
	const fgLight = Math.max(20, 30 + lBoost + lightJitter);
	const bdSat = Math.max(30, 52 + sBoost + satJitter);
	const bdLight = Math.min(90, 78 + lBoost + lightJitter);
	return {
		bg: `hsl(${hue}, ${bgSat}%, ${bgLight}%)`,
		fg: `hsl(${hue}, ${fgSat}%, ${fgLight}%)`,
		border: `hsl(${hue}, ${bdSat}%, ${bdLight}%)`,
	};
}

export function applyTagColors(el: HTMLElement, tag: string, opts: { active?: boolean } = {}) {
	if (opts.active) {
		el.style.background = 'var(--interactive-accent)';
		el.style.color = 'var(--text-on-accent)';
		el.style.borderColor = 'var(--interactive-accent)';
		return;
	}
	const isDark = document.body.classList.contains('theme-dark');
	const c = tagColors(tag, isDark);
	el.style.background = c.bg;
	el.style.color = c.fg;
	el.style.borderColor = c.border;
}
