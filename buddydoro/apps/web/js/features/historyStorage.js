// historyStorage.js — Save and read timed session records for the History window.

const HISTORY_KEY = 'buddydoro_history';

/** Save one completed focus session. */
export function saveSession({ subtaskName, taskName, seconds }) {
    if (!seconds || seconds <= 0) return;
    try {
        const records = loadAllSessions();
        records.push({
            subtaskName: subtaskName || 'Unassigned',
            taskName:    taskName    || '',
            seconds:     Math.round(seconds),
            completedAt: new Date().toISOString(),
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    } catch (e) {
        console.warn('[History] Failed to save session:', e);
    }
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
