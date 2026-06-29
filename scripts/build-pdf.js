import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const FONT_DIR = path.join(ROOT_DIR, 'assets', 'fonts', 'inter');

const resume = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'resume.yaml'), 'utf8'));

const nameParts = resume.name.split(' ');
const firstName = nameParts[0];
const lastName = nameParts[nameParts.length - 1];
const titleSlug = resume.title.replace(/\s+/g, '-');
const fileName = `${firstName}-${lastName}_${titleSlug}_1-1_Graduate.pdf`;
const OUTPUT_FILE = path.join(PUBLIC_DIR, fileName);

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// ── Layout tokens ────────────────────────────────────────────────────────────
const ACCENT = '#374151'; // charcoal gray — name + section headings
const GRAY = '#4b5563';
const BLACK = '#111827';

const FONT = 'Inter';
const FONT_BOLD = 'Inter-Bold';
const FONT_ITALIC = 'Inter-Italic';

const ML = 50;                 // left margin
const MR = 50;                 // right margin
const MT = 45;                 // top margin
const MB = 45;                 // bottom margin
const PAGE_W = 612;            // US Letter width (pt)
const PAGE_H = 792;            // US Letter height (pt)
const CW = PAGE_W - ML - MR;   // content width
const BOTTOM_LIMIT = PAGE_H - MB; // y past which a block should spill to a new page

const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MT, bottom: MB, left: ML, right: MR },
    bufferPages: true,
    info: {
        Title: `${resume.name} — Curriculum Vitae`,
        Author: resume.name,
        Subject: resume.title,
    },
});

// Embed Inter so the PDF matches the website's typeface (OFL-1.1, subset on output).
doc.registerFont(FONT, path.join(FONT_DIR, 'Inter-Regular.ttf'));
doc.registerFont(FONT_BOLD, path.join(FONT_DIR, 'Inter-Bold.ttf'));
doc.registerFont(FONT_ITALIC, path.join(FONT_DIR, 'Inter-Italic.ttf'));

const stream = fs.createWriteStream(OUTPUT_FILE);
doc.pipe(stream);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Add a page break if the next block of `needed` points wouldn't fit above the
// footer band. Keeps section headers and entries from being orphaned and keeps
// two-column rows from splitting across pages.
function ensureSpace(needed) {
    if (doc.y + needed > BOTTOM_LIMIT) doc.addPage();
}

function sectionTitle(label) {
    ensureSpace(70);
    doc.moveDown(0.55);
    doc.font(FONT_BOLD).fontSize(10.5).fillColor(ACCENT).text(label.toUpperCase(), ML, doc.y);
    const ruleY = doc.y + 1;
    doc.moveTo(ML, ruleY).lineTo(ML + CW, ruleY).strokeColor(GRAY).lineWidth(0.35).stroke();
    doc.moveDown(0.3);
    doc.fillColor(BLACK);
}

// Two-column row: renders leftText and rightText side by side at the current y.
function twoCol(leftText, rightText, leftFont, leftSize, leftColor, rightFont, rightSize, rightColor, leftRatio = 0.68) {
    ensureSpace(18);
    const y = doc.y;
    const lw = CW * leftRatio;
    const rw = CW * (1 - leftRatio);

    doc.font(leftFont).fontSize(leftSize).fillColor(leftColor).text(leftText, ML, y, { width: lw });
    const afterLeft = doc.y;

    doc.font(rightFont).fontSize(rightSize).fillColor(rightColor).text(rightText, ML + lw, y, { width: rw, align: 'right' });
    const afterRight = doc.y;

    doc.y = Math.max(afterLeft, afterRight);
}

// Render YAML bullet descriptions (lines starting with "- ") with a hanging
// indent so wrapped lines align under the text, not under the bullet glyph.
const BULLET_INDENT = 12;
function renderBullets(description) {
    for (const raw of description.trim().split('\n')) {
        const t = raw.trim();
        if (!t) continue;
        const text = t.startsWith('- ') ? t.slice(2) : t;
        ensureSpace(20);
        const y = doc.y;
        doc.font(FONT).fontSize(9.5).fillColor(GRAY).text('•', ML, y, { width: BULLET_INDENT });
        doc.font(FONT).fontSize(10).fillColor(BLACK)
            .text(text, ML + BULLET_INDENT, y, { width: CW - BULLET_INDENT, lineGap: 1 });
    }
}

// Left-aligned line of contact items; linked items render in the accent color.
// Segments are positioned manually so each can carry its own color and link
// without PDFKit's per-fragment layout overlapping them.
function contactLine(items) {
    doc.font(FONT).fontSize(9);
    const sep = '   ·   ';
    const sepW = doc.widthOfString(sep);
    const widths = items.map((it) => doc.widthOfString(it.text));
    let x = ML;
    const y = doc.y;
    const lh = doc.currentLineHeight();
    items.forEach((it, idx) => {
        doc.fillColor(it.link ? ACCENT : GRAY).text(it.text, x, y, { lineBreak: false });
        if (it.link) doc.link(x, y, widths[idx], lh, it.link);
        x += widths[idx];
        if (idx < items.length - 1) {
            doc.fillColor(GRAY).text(sep, x, y, { lineBreak: false });
            x += sepW;
        }
    });
    doc.x = ML;
    doc.y = y + lh;
}

// ── HEADER ───────────────────────────────────────────────────────────────────

const phoneHref = resume.phone.replace(/\s+/g, '');

doc.font(FONT_BOLD).fontSize(22).fillColor(BLACK).text(resume.name, ML, doc.y, { width: CW, align: 'left' });
doc.moveDown(0.1);
doc.font(FONT_BOLD).fontSize(11).fillColor(ACCENT).text(resume.headline || resume.title, ML, doc.y, { width: CW, align: 'left' });
doc.moveDown(0.45);

contactLine([
    { text: resume.email, link: `mailto:${resume.email}` },
    { text: resume.phone, link: `tel:${phoneHref}` },
    { text: resume.location },
]);
doc.moveDown(0.3);
contactLine([
    { text: resume.linkedin, link: `https://${resume.linkedin}` },
    { text: resume.github, link: `https://${resume.github}` },
    { text: resume.website.replace(/^https?:\/\//, ''), link: resume.website },
]);

// ── SUMMARY ──────────────────────────────────────────────────────────────────

sectionTitle('Professional Summary');
doc.font(FONT).fontSize(10).fillColor(BLACK).text(resume.summary.trim(), ML, doc.y, { width: CW, lineGap: 1.5 });

// ── SKILLS ───────────────────────────────────────────────────────────────────

sectionTitle('Technical Skills');
const LABEL_W = 108;
for (const cat of resume.skills) {
    ensureSpace(26);
    const y = doc.y;
    doc.font(FONT_BOLD).fontSize(10).fillColor(BLACK).text(cat.category + ':', ML, y, { width: LABEL_W });
    const afterLabel = doc.y;
    doc.font(FONT).fontSize(10).fillColor(BLACK).text(cat.items.join(', '), ML + LABEL_W, y, { width: CW - LABEL_W });
    doc.y = Math.max(afterLabel, doc.y) + 2;
}

// ── EXPERIENCE ───────────────────────────────────────────────────────────────

sectionTitle('Professional Experience');
for (const job of resume.experience) {
    // Measure the full entry so a job's bullets never orphan across a page break.
    doc.font(FONT).fontSize(10);
    let jobNeeded = 30;
    for (const raw of job.description.trim().split('\n')) {
        const t = raw.trim();
        if (t) jobNeeded += doc.heightOfString(t.startsWith('- ') ? t.slice(2) : t, { width: CW - BULLET_INDENT, lineGap: 1 });
    }
    ensureSpace(jobNeeded);
    twoCol(job.role, `${job.start} – ${job.end}`, FONT_BOLD, 11, BLACK, FONT, 9, GRAY);
    twoCol(job.company, job.location, FONT_ITALIC, 9, GRAY, FONT_ITALIC, 9, GRAY);
    doc.moveDown(0.2);
    renderBullets(job.description);
    doc.moveDown(0.5);
}

// ── EDUCATION ────────────────────────────────────────────────────────────────

sectionTitle('Education');
for (const edu of resume.education) {
    ensureSpace(46);
    twoCol(edu.degree, edu.year, FONT_BOLD, 11, BLACK, FONT, 9, GRAY);
    twoCol(edu.institution, edu.location, FONT_ITALIC, 9, GRAY, FONT_ITALIC, 9, GRAY);
    if (edu.description) {
        doc.moveDown(0.15);
        const descFont = edu.highlight ? FONT_BOLD : FONT;
        const descColor = edu.highlight ? BLACK : GRAY;
        doc.font(descFont).fontSize(9.5).fillColor(descColor).text(edu.description, ML, doc.y, { width: CW });
    }
    if (edu.highlight && edu.tags?.length) {
        doc.moveDown(0.12);
        doc.font(FONT_ITALIC).fontSize(8.5).fillColor(GRAY).text(`Relevant coursework: ${edu.tags.join(' · ')}`, ML, doc.y, { width: CW });
    }
    doc.moveDown(0.45);
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────

if (resume.projects?.length) {
    sectionTitle('Key Projects');
    for (const proj of resume.projects) {
        ensureSpace(96);
        // Project name on its own line; repo + demo links on the line below.
        doc.font(FONT_BOLD).fontSize(10).fillColor(BLACK).text(proj.name, ML, doc.y, { width: CW });
        if (proj.url || proj.demo) {
            doc.font(FONT).fontSize(8.5);
            if (proj.url) {
                const repo = proj.url.replace(/^https?:\/\//, '');
                doc.fillColor(ACCENT).text(repo, ML, doc.y, { link: proj.url, continued: !!proj.demo });
            }
            if (proj.demo) {
                if (proj.url) doc.fillColor(GRAY).text('   ·   ', { continued: true });
                doc.fillColor(ACCENT).text(proj.demoLabel || 'Live Demo', { link: proj.demo });
            }
            doc.moveDown(0.15);
        }
        doc.font(FONT).fontSize(10).fillColor(BLACK).text(proj.description.trim(), ML, doc.y, { width: CW, lineGap: 1 });
        if (proj.highlights?.length) {
            doc.moveDown(0.12);
            renderBullets(proj.highlights.map((h) => `- ${h}`).join('\n'));
        }
        if (proj.stack?.length) {
            doc.moveDown(0.1);
            doc.font(FONT_ITALIC).fontSize(8.5).fillColor(GRAY).text(`Tech: ${proj.stack.join(' · ')}`, ML, doc.y, { width: CW });
        }
        doc.moveDown(0.5);
    }
}

// ── CERTIFICATIONS ───────────────────────────────────────────────────────────

if (resume.certifications?.length) {
    sectionTitle('Certifications');
    for (const cert of resume.certifications) {
        ensureSpace(20);
        const y = doc.y;
        const lw = CW * 0.82;
        const rw = CW * 0.18;

        doc.font(FONT_BOLD).fontSize(9.5).fillColor(BLACK)
            .text(cert.name, ML, y, { width: lw, continued: true });
        doc.font(FONT).fontSize(9.5).fillColor(GRAY)
            .text(`  —  ${cert.issuer}`, { width: lw });
        const afterLeft = doc.y;

        doc.font(FONT).fontSize(9.5).fillColor(GRAY)
            .text(cert.date, ML + lw, y, { width: rw, align: 'right' });

        doc.y = Math.max(afterLeft, doc.y) + 3;
    }
}

// ── FINISH ───────────────────────────────────────────────────────────────────

// Stamp a subtle page number (bottom-right) on each page, only when multi-page.
const pages = doc.bufferedPageRange();
if (pages.count > 1) {
    const FOOTER_Y = PAGE_H - 30;
    for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        // Zero the bottom margin while stamping so margin-band text doesn't spawn a blank page.
        const prevBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font(FONT).fontSize(8).fillColor('#9ca3af')
            .text(`${i + 1} / ${pages.count}`, ML, FOOTER_Y, { width: CW, align: 'right', lineBreak: false });
        doc.page.margins.bottom = prevBottom;
    }
}

doc.end();

stream.on('finish', () => console.log(`PDF generated: ${OUTPUT_FILE}`));
stream.on('error', (err) => { console.error('PDF generation failed:', err); process.exit(1); });
