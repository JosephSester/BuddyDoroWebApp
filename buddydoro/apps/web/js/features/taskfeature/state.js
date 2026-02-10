// apps/web/js/features/taskfeature/state.js
// Shared in-memory state for task feature.

export const state = {
    els: { addTaskBtn: null, tasksList: null },
    tasks: [],
    nextTaskId: 1,
    activeTaskId: null,
    sessionEditor: null,
    createTaskCtx: null,
    suppressActiveInTodo: false,
    todoDialogSetupDone: false,
    chipRowObserverAttached: false,
    domIdCounter: 0,
    handlers: {
        onActiveTaskChange: () => { },
        onShouldStopTimer: () => { },
        onTaskEstimate: null,
        onSubtaskEstimate: null,
        onTaskVisualsRefresh: () => { },
    },
};

export const makeDomId = (prefix = 'id') => `${prefix}-${Date.now()}-${++state.domIdCounter}`;
