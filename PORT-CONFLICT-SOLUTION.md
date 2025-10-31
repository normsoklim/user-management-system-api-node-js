# Port Conflict Solution

If you encounter the error "Error: listen EADDRINUSE: address already in use :::3000" when trying to start the server, follow these solutions:

## Solution 1: Use the provided batch script (Windows)

Run the `start-server.bat` file which will automatically detect if port 3000 is in use and start the server on port 3001 if needed.

```bash
start-server.bat
```

## Solution 2: Use npm scripts

Start the server on port 3001 directly:

```bash
npm run dev:3001
```

Or set the PORT environment variable manually:

```bash
PORT=3001 npm run dev
```

## Solution 3: Kill the process using port 3000

### On Windows:
1. Find the process ID using port 3000:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Kill the process using the PID (replace <PID> with the actual process ID):
   ```bash
   taskkill /PID <PID> /F
   ```

### On Mac/Linux:
1. Find the process ID using port 3000:
   ```bash
   lsof -ti:3000
   ```
2. Kill the process:
   ```bash
   kill -9 $(lsof -ti:3000)
   ```

## Solution 4: Change the default port

You can permanently change the default port by setting the PORT environment variable in your `.env` file:

```
PORT=3001
```

## Updated Server Error Handling

The server now includes improved error handling that will:
1. Detect when port 3000 is already in use
2. Provide clear instructions on how to resolve the issue
3. Suggest alternative solutions

This makes it easier to understand and fix port conflicts when they occur.