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
const ACCENT = '#2563eb';
const GRAY = '#4b5563';
const BLACK = '#111827';

const FONT = 'Inter';
const FONT_BOLD = 'Inter-Bold';
const FONT_ITALIC = 'Inter-Italic';

const ML = 50;                 // left margin
const MR = 50;                 // right margin
const MT = 45;                 // top margin
const MB = 60;                 // bottom margin (leaves room for the footer band)
const PAGE_W = 612;            // US Letter width (pt)
const PAGE_H = 792;            // US Letter height (pt)
const CW = PAGE_W - ML - MR;   // content width
const BOTTOM_LIMIT = PAGE_H - MB; // y past which a block should spill to a new page
const FOOTER_Y = PAGE_H - 27;  // footer baseline, inside the bottom margin

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
        doc.font(FONT).fontSize(9.5).fillColor(BLACK)
            .text(text, ML + BULLET_INDENT, y, { width: CW - BULLET_INDENT, lineGap: 1 });
    }
}

// Centered line of contact items; linked items render in the accent color.
// Segments are positioned manually — PDFKit re-centers each `continued`
// fragment independently, which would overlap them.
function contactLine(items) {
    doc.font(FONT).fontSize(9);
    const sep = '   ·   ';
    const sepW = doc.widthOfString(sep);
    const widths = items.map((it) => doc.widthOfString(it.text));
    const totalW = widths.reduce((a, b) => a + b, 0) + sepW * (items.length - 1);
    let x = ML + (CW - totalW) / 2;
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

doc.font(FONT_BOLD).fontSize(22).fillColor(BLACK).text(resume.name, { align: 'center' });
doc.moveDown(0.1);
doc.font(FONT_BOLD).fontSize(12).fillColor(ACCENT).text(resume.title, { align: 'center' });
doc.moveDown(0.35);

contactLine([
    { text: resume.email, link: `mailto:${resume.email}` },
    { text: resume.phone, link: `tel:${phoneHref}` },
    { text: resume.location },
]);
doc.moveDown(0.15);
contactLine([
    { text: resume.linkedin, link: `https://${resume.linkedin}` },
    { text: resume.github, link: `https://${resume.github}` },
    { text: resume.website.replace(/^https?:\/\//, ''), link: resume.website },
]);

// ── SUMMARY ──────────────────────────────────────────────────────────────────

sectionTitle('Professional Summary');
doc.font(FONT).fontSize(9.5).fillColor(BLACK).text(resume.summary.trim(), ML, doc.y, { width: CW, lineGap: 1.5 });

// ── EXPERIENCE ───────────────────────────────────────────────────────────────

sectionTitle('Professional Experience');
for (const job of resume.experience) {
    ensureSpace(58);
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
        doc.font(FONT).fontSize(9).fillColor(GRAY).text(edu.description, ML, doc.y, { width: CW });
    }
    doc.moveDown(0.45);
}

// ── SKILLS ───────────────────────────────────────────────────────────────────

sectionTitle('Technical Skills');
const LABEL_W = 145;
for (const cat of resume.skills) {
    ensureSpace(26);
    const y = doc.y;
    doc.font(FONT_BOLD).fontSize(9.5).fillColor(BLACK).text(cat.category + ':', ML, y, { width: LABEL_W });
    const afterLabel = doc.y;
    doc.font(FONT).fontSize(9.5).fillColor(BLACK).text(cat.items.join(', '), ML + LABEL_W, y, { width: CW - LABEL_W });
    doc.y = Math.max(afterLabel, doc.y) + 2;
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────

if (resume.projects?.length) {
    sectionTitle('Key Projects');
    for (const proj of resume.projects) {
        ensureSpace(42);
        if (proj.url) {
            doc.font(FONT_BOLD).fontSize(10).fillColor(BLACK).text(proj.name, ML, doc.y, { continued: true, width: CW });
            doc.font(FONT).fontSize(9).fillColor(ACCENT).text(`  |  ${proj.url}`, { link: proj.url, underline: true, width: CW });
        } else {
            doc.font(FONT_BOLD).fontSize(10).fillColor(BLACK).text(proj.name, ML, doc.y, { width: CW });
        }
        doc.font(FONT).fontSize(9.5).fillColor(BLACK).text(proj.description.trim(), ML, doc.y, { width: CW, lineGap: 1 });
        doc.moveDown(0.45);
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

// ── FOOTER (page number, generation date, live-site link) ────────────────────

const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Zero the bottom margin while stamping so footer text placed in the margin
    // band doesn't trip PDFKit's overflow check and spawn blank pages.
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font(FONT).fontSize(7.5).fillColor(GRAY);
    doc.text(`Generated ${dateStr}`, ML, FOOTER_Y, { width: CW, align: 'left', lineBreak: false });
    doc.text(resume.website.replace(/^https?:\/\//, ''), ML, FOOTER_Y, { width: CW, align: 'center', link: resume.website, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, ML, FOOTER_Y, { width: CW, align: 'right', lineBreak: false });
    doc.page.margins.bottom = prevBottom;
}

// ── FINISH ───────────────────────────────────────────────────────────────────

doc.end();

stream.on('finish', () => console.log(`PDF generated: ${OUTPUT_FILE}`));
stream.on('error', (err) => { console.error('PDF generation failed:', err); process.exit(1); });
