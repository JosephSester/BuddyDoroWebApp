export function getElements() {
    return Object.freeze({
        chip:         document.getElementById('resourcesChip'),
        backdrop:     document.getElementById('resourcesBackdrop'),
        dialog:       document.getElementById('resourcesDialog'),
        closeTop:     document.getElementById('resourcesClose'),
        closeBottom:  document.getElementById('resourcesCloseBottom'),
        searchInput:  document.getElementById('resourcesSearchInput'),
        searchBtn:    document.getElementById('resourcesSearchBtn'),
        tabs:         Array.from(document.querySelectorAll('[data-resources-tab]')),
        panelDiscover: document.getElementById('resourcesTabDiscover'),
        panelSaved:    document.getElementById('resourcesTabSaved'),
        panelNotes:    document.getElementById('resourcesTabNotes'),
    });
}
