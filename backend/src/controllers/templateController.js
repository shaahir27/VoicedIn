// Template metadata — same as frontend templates.js
const TEMPLATES = [
    {
        id: 'modern',
        name: 'Modern',
        description: 'Bright blue header, crisp dividers, and a clean SaaS-style finish.',
        colors: { primary: '#2563EB', secondary: '#0E7490', accent: '#DBEAFE' },
        popular: true,
    },
    {
        id: 'classic',
        name: 'Classic',
        description: 'Black-and-white document styling for formal consulting and corporate invoices.',
        colors: { primary: '#111827', secondary: '#6B7280', accent: '#F3F4F6' },
        popular: false,
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Mostly white space with a sharp teal accent and light table treatment.',
        colors: { primary: '#0F766E', secondary: '#0F172A', accent: '#F0FDFA' },
        popular: false,
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Polished rose accents with a softer premium service feel.',
        colors: { primary: '#BE123C', secondary: '#831843', accent: '#FFF1F2' },
        popular: true,
    },
    {
        id: 'bold',
        name: 'Bold',
        description: 'High-contrast green blocks for energetic startup and product invoices.',
        colors: { primary: '#16A34A', secondary: '#14532D', accent: '#DCFCE7' },
        popular: false,
    },
];

export async function listTemplates(req, res) {
    res.json({ success: true, templates: TEMPLATES });
}

export async function getTemplate(req, res) {
    const template = TEMPLATES.find(t => t.id === req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, template });
}
