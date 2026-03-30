// historyStorage.js — Save and read timed session records for the History window.

const HISTORY_KEY        = 'buddydoro_history';
const API_BASE           = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('authToken'); }

async function apiPost(endpoint, data) {
    try {
        await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(data),
        });
    } catch (e) { console.warn('[History] API save failed:', e); }
}

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (!res.ok) return null;
        return res.json();
    } catch (e) { console.warn('[History] API load failed:', e); return null; }
}

/** Save one completed focus session (localStorage + backend). */
export function saveSession({ subtaskName, taskName, seconds }) {
    if (!seconds || seconds <= 0) return;
    try {
        const entry = {
            subtaskName: subtaskName || 'Unassigned',
            taskName:    taskName    || '',
            seconds:     Math.round(seconds),
            completedAt: new Date().toISOString(),
        };
        const records = loadAllSessions();
        records.push(entry);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
        apiPost('/history/sessions', entry); // fire-and-forget
    } catch (e) {
        console.warn('[History] Failed to save session:', e);
    }
}

/** Async: load sessions from API, refresh localStorage, return array. */
export async function loadSessionsFromAPI() {
    const data = await apiGet('/history/sessions');
    if (Array.isArray(data)) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(data)); } catch {}
        return data;
    }
    return loadAllSessions();
}

/** Load every saved session record. */
export function loadAllSessions() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Filter records to a given period relative to now. */
export function filterByPeriod(records, period) {
    const now = new Date();
    return records.filter(r => {
        const d = new Date(r.completedAt);
        if (isNaN(d)) return false;
        switch (period) {
            case 'daily':
                return d.getFullYear() === now.getFullYear() &&
                       d.getMonth()    === now.getMonth()    &&
                       d.getDate()     === now.getDate();
            case 'weekly': {
                // current Mon–Sun week
                const monday = new Date(now);
                monday.setHours(0, 0, 0, 0);
                monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 7);
                return d >= monday && d < sunday;
            }
            case 'monthly':
                return d.getFullYear() === now.getFullYear() &&
                       d.getMonth()    === now.getMonth();
            case 'yearly':
                return d.getFullYear() === now.getFullYear();
            case 'lifetime':
            default:
                return true;
        }
    });
}

/** Build bar-chart data for the given period.
 *  Returns [{ label, seconds }] in chronological order. */
export function buildBars(records, period) {
    const now = new Date();

    if (period === 'daily') {
        const hours = Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), seconds: 0 }));
        records.forEach(r => {
            const h = new Date(r.completedAt).getHours();
            hours[h].seconds += r.seconds;
        });
        return hours;
    }

    if (period === 'weekly') {
        const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const bars = DAYS.map(label => ({ label, seconds: 0 }));
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        records.forEach(r => {
            const d = new Date(r.completedAt);
            const idx = Math.floor((d - monday) / 86400000);
            if (idx >= 0 && idx < 7) bars[idx].seconds += r.seconds;
        });
        return bars;
    }

    if (period === 'monthly') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const bars = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), seconds: 0 }));
        records.forEach(r => {
            const d = new Date(r.completedAt);
            bars[d.getDate() - 1].seconds += r.seconds;
        });
        return bars;
    }

    if (period === 'yearly') {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const bars = MONTHS.map(label => ({ label, seconds: 0 }));
        records.forEach(r => {
            const d = new Date(r.completedAt);
            bars[d.getMonth()].seconds += r.seconds;
        });
        return bars;
    }

    // lifetime — group by year
    if (!records.length) return [];
    const years = {};
    records.forEach(r => {
        const y = String(new Date(r.completedAt).getFullYear());
        years[y] = (years[y] || 0) + r.seconds;
    });
    return Object.keys(years).sort().map(y => ({ label: y, seconds: years[y] }));
}

/** Sum seconds per subtask name from an array of records. */
export function buildSubtaskTotals(records) {
    const map = {};
    records.forEach(r => {
        const key = r.subtaskName || 'Unassigned';
        map[key] = (map[key] || 0) + r.seconds;
    });
    return Object.entries(map)
        .map(([name, seconds]) => ({ name, seconds }))
        .sort((a, b) => b.seconds - a.seconds);
}

const SESSION_RECORD_KEY = 'buddydoro_session_records';

/** Save one completed study session record (localStorage + backend). */
export function saveSessionRecord({ goalName, pomodorosCompleted, totalSeconds, goalComplete, completedAt }) {
    try {
        const entry = {
            goalName:           goalName || 'Unknown Goal',
            pomodorosCompleted: pomodorosCompleted || 0,
            totalSeconds:       Math.round(totalSeconds || 0),
            goalComplete:       !!goalComplete,
            completedAt:        completedAt || new Date().toISOString(),
        };
        const records = loadSessionRecords();
        records.push(entry);
        localStorage.setItem(SESSION_RECORD_KEY, JSON.stringify(records));
        apiPost('/history/records', entry); // fire-and-forget
    } catch (e) {
        console.warn('[History] Failed to save session record:', e);
    }
}

/** Load all session-level records. */
export function loadSessionRecords() {
    try {
        const raw = localStorage.getItem(SESSION_RECORD_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Async: load session records from API, refresh localStorage, return array. */
export async function loadRecordsFromAPI() {
    const data = await apiGet('/history/records');
    if (Array.isArray(data)) {
        try { localStorage.setItem(SESSION_RECORD_KEY, JSON.stringify(data)); } catch {}
        return data;
    }
    return loadSessionRecords();
}

/** Format seconds as "Xh Ym" or "Ym" */
export function fmtDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatHour(h) {
    if (h === 0)  return '12a';
    if (h < 12)  return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
}
