# BuddyDoro API - Getting Started Guide

## 🎯 For Beginners: What is an API?

An **API (Application Programming Interface)** is like a waiter in a restaurant:
- Your **frontend** (the customer) asks for something
- The **API** (the waiter) takes the request to the kitchen
- The **backend/database** (the kitchen) prepares it
- The **API** brings back the response

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd buddydoro/apps/api
npm install
```

### 2. Run the API
```bash
npm run dev
```

You should see:
```
🚀 BuddyDoro API running on http://localhost:3001
```

### 3. Test It!
Open your browser and go to: `http://localhost:3001`

You should see:
```json
{
  "message": "BuddyDoro API is running!",
  "timestamp": "2026-01-16T..."
}
```

## 📚 Understanding the Endpoints

### What is an Endpoint?
An endpoint is a specific URL that does something. Think of it as a function you can call from the internet.

### Example: Tasks API

#### Create a Task (POST)
```javascript
// Frontend code
fetch('http://localhost:3001/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'My first task' })
})
```

#### Get All Tasks (GET)
```javascript
// Frontend code
fetch('http://localhost:3001/api/tasks')
  .then(res => res.json())
  .then(tasks => console.log(tasks))
```

## 🧪 Testing with Tools

### Option 1: Browser (for GET requests only)
Just paste in your browser:
- `http://localhost:3001/api/tasks`
- `http://localhost:3001/api/timer/stats`

### Option 2: VS Code REST Client Extension
Install "REST Client" extension, then create a file `test.http`:

```http
### Get all tasks
GET http://localhost:3001/api/tasks

### Create a task
POST http://localhost:3001/api/tasks
Content-Type: application/json

{
  "text": "Learn APIs"
}

### Start a timer
POST http://localhost:3001/api/timer/start
Content-Type: application/json

{
  "duration": 25,
  "type": "focus"
}
```

### Option 3: PowerShell
```powershell
# GET request
Invoke-RestMethod http://localhost:3001/api/tasks

# POST request
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/tasks -Body (@{text="My task"} | ConvertTo-Json) -ContentType "application/json"
```

## 🔗 Connecting Frontend to Backend

### In your frontend JavaScript:
```javascript
// Example: Save a task from frontend
async function saveTask(taskText) {
  try {
    const response = await fetch('http://localhost:3001/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: taskText })
    });
    
    const task = await response.json();
    console.log('Task saved:', task);
    return task;
  } catch (error) {
    console.error('Error saving task:', error);
  }
}
```

## 📖 Learn More

### Key Concepts:
1. **HTTP Methods**:
   - GET = Read data
   - POST = Create data
   - PUT = Update data
   - DELETE = Delete data

2. **Status Codes**:
   - 200 = Success
   - 201 = Created
   - 404 = Not found
   - 500 = Server error

3. **Request/Response**:
   - Request = What you send to the API
   - Response = What the API sends back

## 🎯 Your Next Steps

1. ✅ Run the API and test the endpoints
2. ✅ Connect one frontend feature to the API
3. ✅ Add authentication (user login)
4. ✅ Add a real database (MongoDB/PostgreSQL)
5. ✅ Deploy to production

Start with step 1 and work your way up!
