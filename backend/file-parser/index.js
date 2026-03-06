const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Extract plain text from uploaded file buffer based on MIME type / extension.
 * Supports: PDF, DOCX, DOC, PPTX, PPT, TXT
 */
async function extractText(buffer, originalName) {
    const ext = path.extname(originalName).toLowerCase();

    // ── PDF ──────────────────────────────────────────────────
    if (ext === '.pdf') {
        const data = await pdfParse(buffer);
        return data.text || '';
    }

    // ── DOCX / DOC ────────────────────────────────────────────
    if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
    }

    // ── PPTX / PPT — extract raw XML text ────────────────────
    if (ext === '.pptx' || ext === '.ppt') {
        // PPTX files are ZIP archives; we read slide XML text nodes
        try {
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(buffer);
            let text = '';
            zip.getEntries().forEach(entry => {
                if (entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')) {
                    const xml = entry.getData().toString('utf8');
                    // Extract text between <a:t> tags
                    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
                    matches.forEach(m => {
                        text += m.replace(/<[^>]+>/g, '') + ' ';
                    });
                }
            });
            return text.trim();
        } catch (err) {
            console.error('[PPT extract]', err.message);
            return 'Could not extract PPT content.';
        }
    }

    // ── TXT / fallback ────────────────────────────────────────
    return buffer.toString('utf8');
}

module.exports = { extractText };
