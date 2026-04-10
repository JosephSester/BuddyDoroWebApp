# Frontend-to-API Integration Guide

## 🎯 Goal
Connect your `tasks.js` frontend to the API backend so tasks persist across page refreshes.

## 📋 What We've Created

1. **`apiClient.js`** - Low-level HTTP client (GET, POST, PUT, DELETE)
2. **`taskService.js`** - High-level task operations using the API

## 🔗 Integration Steps

### Step 1: Import the API Service
At the top of `apps/web/js/features/tasks.js`, add:

```javascript
import { fetchTasks, createTask, updateTask, deleteTask } from '../api/taskService.js';
```

### Step 2: Load Tasks on Init
Modify `initTasks()` to fetch tasks from the API:

```javascript
export async function initTasks(opts = {}) {
  // ... existing code ...
  
  // NEW: Load tasks from API
  try {
    const apiTasks = await fetchTasks();
    tasks = []; // Clear in-memory tasks
    apiTasks.forEach(t => {
      tasks.push({
        id: t.id,
        name: t.text,
        total: 1,
        done: t.completed ? 1 : 0
      });
    });
  } catch (error) {
    console.error('Failed to load tasks:', error);
    // Fall back to empty list
  }
  
  renderAllTasks();
  notifyActiveChange();
}
```

### Step 3: Save When Creating
Modify the `addTask()` function:

```javascript
async function addTask(name, total, { atTop = false } = {}) {
  try {
    // Create on API
    const apiTask = await createTask(name);
    
    // Add to local state
    const t = {
      id: apiTask.id,  // Use API ID!
      name: apiTask.text,
      total: total || 1,
      done: 0
    };
    if (atTop) tasks.unshift(t);
    else tasks.push(t);
    
    renderAllTasks();
    return t;
  } catch (error) {
    console.error('Failed to create task:', error);
    alert('Could not save task. Please try again.');
  }
}
```

### Step 4: Save When Deleting
Modify the `deleteTask()` function:

```javascript
async function deleteTask(id) {
  try {
    // Delete on API
    await deleteTask(id);
    
    // Remove from local state
    const i = tasks.findIndex(t => t.id === id);
    if (i === -1) return;
    const [removed] = tasks.splice(i, 1);
    if (removed.id === activeTaskId) {
      activeTaskId = null;
      try { onShouldStopTimer(); } catch { /* noop */ }
    }
    
    renderAllTasks();
  } catch (error) {
    console.error('Failed to delete task:', error);
    alert('Could not delete task. Please try again.');
  }
}
```

### Step 5: Save When Updating (Sessions)
Look for where sessions are updated (search for "done" in tasks.js):

```javascript
// When updating sessions, also update the API
async function updateTaskSessions(taskId, newDone, newTotal) {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Update API
    await updateTask(taskId, {
      completed: newDone > 0
    });
    
    // Update local state
    task.done = newDone;
    task.total = newTotal;
    
    renderAllTasks();
  } catch (error) {
    console.error('Failed to update task:', error);
    alert('Could not update task. Please try again.');
  }
}
```

## 🧪 Testing

1. Start the API: `npm run dev` (in `apps/api`)
2. Open the web app
3. Create a task - it should save to the API
4. Refresh the page - the task should still be there!
5. Modify a task - it should update immediately
6. Delete a task - it should be removed from the API

## ⚠️ Important

- The frontend `task.id` must match the API response `id`
- Keep tasks synced: always update the API before updating local state
- Handle errors gracefully (show users if something fails)
- API is running on `http://localhost:3001` (check `apiClient.js`)

## 🚀 Next Steps

Once this is working:
1. Test all CRUD operations
2. Add error handling UI (show toasts when saves fail)
3. Add loading states (show spinner while saving)
4. Add authentication (user login)
5. Replace in-memory storage with a database

---

**Need help?** Check the API endpoints in `apps/api/test.http`
