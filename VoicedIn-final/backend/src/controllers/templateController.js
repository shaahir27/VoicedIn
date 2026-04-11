// Template metadata — same as frontend templates.js
const TEMPLATES = [
    {
        id: 'modern',
        name: 'Modern',
        description: 'Clean lines with bold accents. Perfect for tech and creative professionals.',
        colors: { primary: '#6366F1', secondary: '#1E293B', accent: '#EEF2FF' },
        popular: true,
    },
    {
        id: 'classic',
        name: 'Classic',
        description: 'Timeless professional layout. Ideal for consulting and corporate clients.',
        colors: { primary: '#1E293B', secondary: '#475569', accent: '#F8FAFC' },
        popular: false,
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Ultra-clean whitespace-focused design. Great for creative agencies.',
        colors: { primary: '#0F172A', secondary: '#64748B', accent: '#FFFFFF' },
        popular: false,
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Sophisticated design with subtle gradients. Perfect for premium services.',
        colors: { primary: '#7C3AED', secondary: '#4C1D95', accent: '#F5F3FF' },
        popular: true,
    },
    {
        id: 'bold',
        name: 'Bold',
        description: 'Eye-catching design with strong color blocks. Great for startups.',
        colors: { primary: '#059669', secondary: '#064E3B', accent: '#ECFDF5' },
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
