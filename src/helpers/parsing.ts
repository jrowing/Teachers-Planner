// Obsidian gives us front matter pre-parsed via metadataCache, so we don't need
// our own YAML parser. But we DO need to extract a "## Requirements" section
// from the body and rebuild it on save.

export function extractRequirements(
	body: string,
	allowedHeadings: string[]
): { items: string[]; bodyWithout: string } {
	const lines = body.split(/\r?\n/);
	const headingRe = /^(#{1,6})\s+(.+?)\s*$/;
	const allowed = new Set(allowedHeadings.map(h => h.toLowerCase()));

	let sectionStart = -1;
	let sectionLevel = 0;
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(headingRe);
		if (!m) continue;
		const title = m[2].trim().toLowerCase();
		if (allowed.has(title)) {
			sectionStart = i;
			sectionLevel = m[1].length;
			break;
		}
	}
	if (sectionStart === -1) return { items: [], bodyWithout: body };

	let sectionEnd = lines.length;
	for (let i = sectionStart + 1; i < lines.length; i++) {
		const m = lines[i].match(headingRe);
		if (m && m[1].length <= sectionLevel) {
			sectionEnd = i;
			break;
		}
	}

	const items: string[] = [];
	for (let i = sectionStart + 1; i < sectionEnd; i++) {
		const line = lines[i];
		const bullet = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/);
		if (bullet) {
			const text = bullet[1].replace(/^\[\s*[ xX]?\s*\]\s*/, '').trim();
			if (text) items.push(text);
		}
	}

	const before = lines.slice(0, sectionStart).join('\n').replace(/\s+$/, '');
	const after = lines.slice(sectionEnd).join('\n').replace(/^\s+/, '');
	const bodyWithout = [before, after].filter(Boolean).join('\n\n');
	return { items, bodyWithout };
}

/// Compose a body that ends with a "## Requirements" section.
/// Used when creating or saving entries.
export function composeBodyWithRequirements(body: string, requirements: string[]): string {
	const trimmed = (body || '').trim();
	if (requirements.length === 0) return trimmed;
	const reqBlock = ['## Requirements', '', ...requirements.map(r => `- ${r}`)].join('\n');
	if (!trimmed) return reqBlock;
	return `${trimmed}\n\n${reqBlock}`;
}

export function parseRequirementsList(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map(l => l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').replace(/^\[\s*[ xX]?\s*\]\s*/, '').trim())
		.filter(Boolean);
}

/// Read tags from any of: frontmatter.tags (array or comma string), inline #tags.
/// Obsidian's metadataCache normalizes tags but our store hits front matter directly.
export function normalizeTags(rawTags: string | string[] | undefined): string[] {
	if (!rawTags) return [];
	if (Array.isArray(rawTags)) {
		return rawTags
			.map(t => String(t).replace(/^#/, '').trim())
			.filter(Boolean);
	}
	const str = String(rawTags);
	if (str.startsWith('[') && str.endsWith(']')) {
		return str
			.slice(1, -1)
			.split(',')
			.map(s => s.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
			.filter(Boolean);
	}
	return str.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
}
