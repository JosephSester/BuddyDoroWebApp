// Degree Pathway — standalone page script
import { apiPost } from './api/apiClient.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
if (!localStorage.getItem('authToken')) {
    window.location.href = 'login.html';
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stateUpload  = document.getElementById('stateUpload');
const stateReview  = document.getElementById('stateReview');
const stateSuccess = document.getElementById('stateSuccess');

const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const pasteArea    = document.getElementById('pasteArea');
const parseBtn     = document.getElementById('parseBtn');
const uploadError  = document.getElementById('uploadError');

const degreeTitle  = document.getElementById('degreeTitle');
const courseCount  = document.getElementById('courseCount');
const semesterGroups = document.getElementById('semesterGroups');
const selectAllBtn   = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const importBtn    = document.getElementById('importBtn');
const importCount  = document.getElementById('importCount');

const successPanels = document.getElementById('successPanels');
const successTasks  = document.getElementById('successTasks');

// ── State ─────────────────────────────────────────────────────────────────────
let parsedData     = null;
let selectedCourses = new Set();

// ── Show/hide states ──────────────────────────────────────────────────────────
function showState(name) {
    stateUpload.hidden  = name !== 'upload';
    stateReview.hidden  = name !== 'review';
    stateSuccess.hidden = name !== 'success';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
showState('upload');

// ── File drop zone ────────────────────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('is-dragging');
});
['dragleave', 'dragend'].forEach(ev =>
    uploadZone.addEventListener(ev, () => uploadZone.classList.remove('is-dragging'))
);
uploadZone.addEventListener('drop', async e => {
    e.preventDefault();
    uploadZone.classList.remove('is-dragging');
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
});
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', async () => {
    if (fileInput.files[0]) await handleFile(fileInput.files[0]);
});

async function handleFile(file) {
    hideError();
    if (file.size > 5 * 1024 * 1024) {
        showError('File too large. Please use a file under 5 MB.');
        return;
    }
    setUploadLoading(true);
    try {
        let text = '';
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            text = await extractPdfText(file);
        } else {
            text = await readTextFile(file);
        }
        pasteArea.value = text.slice(0, 12000);
        uploadZone.classList.add('is-loaded');
        uploadZone.querySelector('.pw-dropzone-title').textContent = `✓ ${file.name}`;
        uploadZone.querySelector('.pw-dropzone-sub').textContent = 'File loaded — click Parse to continue';
    } catch (err) {
        console.error('[Pathway] File read failed:', err);
        const msg = err?.message ? `Could not read the file: ${err.message}` : 'Could not read the file. Try pasting the text directly below.';
        showError(msg);
    } finally {
        setUploadLoading(false);
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function extractPdfText(file) {
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('PDF library not loaded. Please paste your degree plan text directly.');
    lib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
}

// ── Parse ─────────────────────────────────────────────────────────────────────
parseBtn.addEventListener('click', parseDocument);

async function parseDocument() {
    const text = pasteArea.value.trim();
    if (!text) {
        showError('Please upload a file or paste your degree plan text first.');
        return;
    }
    hideError();
    setParseLoading(true);
    try {
        parsedData = await apiPost('/pathway/parse', { documentText: text });
        renderReview(parsedData);
        showState('review');
    } catch (err) {
        showError(err.message || 'Failed to parse. Check your input and try again.');
    } finally {
        setParseLoading(false);
    }
}

function setUploadLoading(on) {
    uploadZone.classList.toggle('is-loading', on);
}

function setParseLoading(on) {
    parseBtn.disabled    = on;
    parseBtn.innerHTML   = on
        ? `<span class="pw-spinner"></span> Analyzing…`
        : `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Parse My Degree Plan`;
}

function showError(msg) {
    uploadError.textContent = msg;
    uploadError.hidden = false;
}
function hideError() { uploadError.hidden = true; }

// ── Review ────────────────────────────────────────────────────────────────────
function renderReview(data) {
    const label = [data.degree, data.university].filter(Boolean).join(' · ') || 'Your Degree Plan';
    degreeTitle.textContent = label;
    courseCount.textContent = `${data.courses.length} course${data.courses.length !== 1 ? 's' : ''} found`;

    // Group by semester, preserving order of first appearance
    const order = [];
    const groups = {};
    data.courses.forEach((course, i) => {
        const sem = course.semester || 'Unscheduled';
        if (!groups[sem]) { groups[sem] = []; order.push(sem); }
        groups[sem].push({ ...course, index: i });
    });

    selectedCourses = new Set(data.courses.map((_, i) => i));
    semesterGroups.innerHTML = '';

    order.forEach(sem => {
        const section = document.createElement('div');
        section.className = 'pw-semester';

        section.innerHTML = `
            <div class="pw-semester-header">
                <span class="pw-semester-name">${escHtml(sem)}</span>
                <span class="pw-semester-count">${groups[sem].length} course${groups[sem].length !== 1 ? 's' : ''}</span>
            </div>
            <div class="pw-course-grid"></div>`;

        const grid = section.querySelector('.pw-course-grid');
        groups[sem].forEach(course => grid.appendChild(buildCourseCard(course)));
        semesterGroups.appendChild(section);
    });

    updateImportBtn();
}

function buildCourseCard(course) {
    const card = document.createElement('label');
    card.className = 'pw-course-card';
    card.dataset.index = course.index;

    const typeClass = { required: 'required', elective: 'elective', core: 'core' }[course.type] || 'required';

    card.innerHTML = `
        <input type="checkbox" class="pw-course-check" data-index="${course.index}" checked
            aria-label="${escHtml(course.name)}">
        <div class="pw-course-body">
            ${course.code ? `<span class="pw-course-code">${escHtml(course.code)}</span>` : ''}
            <span class="pw-course-name">${escHtml(course.name)}</span>
            <div class="pw-course-meta">
                <span class="pw-course-credits">${course.credits} cr</span>
                <span class="pw-course-type pw-course-type--${typeClass}">${course.type}</span>
            </div>
        </div>
        <div class="pw-course-check-indicator" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`;

    const checkbox = card.querySelector('.pw-course-check');
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedCourses.add(course.index);
        else selectedCourses.delete(course.index);
        card.classList.toggle('is-deselected', !checkbox.checked);
        updateImportBtn();
    });

    return card;
}

function updateImportBtn() {
    const n = selectedCourses.size;
    importBtn.disabled   = n === 0;
    importCount.textContent = n;
}

selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.pw-course-check').forEach(cb => {
        cb.checked = true;
        selectedCourses.add(Number(cb.dataset.index));
        cb.closest('.pw-course-card').classList.remove('is-deselected');
    });
    updateImportBtn();
});

deselectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.pw-course-check').forEach(cb => {
        cb.checked = false;
        selectedCourses.delete(Number(cb.dataset.index));
        cb.closest('.pw-course-card').classList.add('is-deselected');
    });
    updateImportBtn();
});

// ── Import ────────────────────────────────────────────────────────────────────
importBtn.addEventListener('click', async () => {
    const courses = parsedData.courses.filter((_, i) => selectedCourses.has(i));
    importBtn.disabled   = true;
    importBtn.innerHTML  = `<span class="pw-spinner"></span> Creating goals…`;

    try {
        const result = await apiPost('/pathway/import', { courses });
        successPanels.textContent = result.panelsCreated;
        successTasks.textContent  = result.tasksCreated;
        showState('success');
    } catch {
        importBtn.disabled  = false;
        importBtn.innerHTML = `Import <span id="importCount">${selectedCourses.size}</span> Goals to BuddyDoro`;
    }
});

// ── Success ───────────────────────────────────────────────────────────────────
document.getElementById('goToAppBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('importAnotherBtn').addEventListener('click', () => {
    parsedData = null;
    selectedCourses.clear();
    pasteArea.value   = '';
    fileInput.value   = '';
    uploadZone.classList.remove('is-loaded', 'is-loading');
    uploadZone.querySelector('.pw-dropzone-title').textContent = 'Drag & drop your degree plan';
    uploadZone.querySelector('.pw-dropzone-sub').textContent   = 'PDF or text file · max 5 MB';
    hideError();
    showState('upload');
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
