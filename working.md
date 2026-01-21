# TackPad Real-Time Syncing: A Technical Deep Dive

This document provides a detailed technical explanation of the real-time data synchronization mechanism in TackPad. The system is built on Nuxt 3, using Pinia for client-side state management and a Server-Sent Events (SSE) architecture for pushing updates to clients.

## Core Architecture

The sync architecture consists of three main parts:

1.  **Nuxt 3 Application (Client & Server):**
    *   **Client-side (Vue):** Renders the board and handles user interactions.
    *   **Server-side API (`/server/api`):** Acts as the primary interface for database operations (fetching and saving board state). It is the authority for data persistence.

2.  **Pinia State Management:**
    *   A central Pinia store (`stores/board.ts`) holds the entire state of the current board on the client. All local changes and incoming server updates are processed through this store, ensuring a single source of truth for the UI.

3.  **External SSE Service:**
    *   A dedicated service (e.g., `https://tackpad-sse.onrender.com`) that acts as a simple real-time message broker. Its sole responsibility is to receive data from the Nuxt backend and broadcast it to all clients subscribed to a specific board channel.

---

## The Syncing Lifecycle: From Interaction to Broadcast

Here is the step-by-step process of how data is synchronized between clients.

### Step 1: Initial Board Load and Subscribing to Updates

When a user navigates to a board URL (`/board/[id]`), the following occurs:

1.  **State Initialization:** The `initializeBoard` action in `stores/board.ts` is dispatched.
2.  **API Fetch:** It sends a `GET` request to `/api/board/[id]`. The backend handler (`server/api/board/[id]/index.get.ts`) fetches the complete board data from the database.
3.  **Store Hydration:** The fetched data is used to populate the Pinia `board` state. The data, which is stored in the database as a JSON object, is converted into a client-side friendly format where `items` are stored in a `Map` for efficient access (`deserializeBoardUniversal`).
4.  **SSE Connection:** In the `pages/board/[id].client.vue` component's `onMounted` hook, an `EventSource` connection is established with the SSE service.
    *   The specific SSE server URL is chosen using the `getSSEServer(boardId)` function from `shared/board.ts`. This function hashes the board ID to pick one of the available SSE server instances, providing basic load distribution.
    *   The client subscribes to a channel unique to the board, for instance: `https://tackpad-sse.onrender.com/sse/BOARD-XYZ123`.

    ```javascript
    // Simplified example from pages/board/[id].client.vue
    let eventSource: EventSource;
    onMounted(() => {
      const boardId = route.params.id as string;
      const sseServerUrl = getSSEServer(boardId); // e.g., https://tackpad-sse.onrender.com

      eventSource = new EventSource(`${sseServerUrl}/sse/${boardId}`);

      eventSource.onmessage = (event) => {
        const updatedBoardData = JSON.parse(event.data);
        // Update the Pinia store with the new state from another client
        boardStore.setBoardStateFromServer(updatedBoardData);
      };

      eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        eventSource.close();
      };
    });
    ```

### Step 2: Making a Local Change

1.  **User Interaction:** A user performs an action, like dragging a sticky note.
2.  **Immediate State Update:** The corresponding component dispatches an action to the Pinia store (e.g., `updateItemPosition(itemId, newX, newY)`).
3.  **Optimistic UI:** The store *immediately* mutates its local state. For example, it updates the `x_position` and `y_position` of the item within the `board.value.data.items` Map.
4.  **Reactive UI:** Because the Vue components are subscribed to the Pinia store, the UI updates instantly, providing a fluid experience for the user who made the change.
5.  **Debounced Save:** After mutating the state, the store calls `debouncedSaveBoard()`. This is a critical performance optimization. The `saveBoard` function is wrapped in a `debounce` call with a 3-second timer. This prevents the application from spamming the backend with save requests for every minor change (e.g., during a continuous drag operation).

### Step 3: Persisting and Broadcasting the Change

1.  **Saving the Board:** After 3 seconds of user inactivity, the `debouncedSaveBoard` function finally executes the `saveBoard` action.
2.  **Data Serialization:** `saveBoard` prepares the data for the API. It converts the `items` `Map` back into a plain JavaScript object using the `mapToObject` utility.
3.  **API Request:** It sends a `POST` request to `/api/save/[id]` with the *entire current board state* as the JSON payload.
4.  **Backend Processing (`server/api/save/[id].post.ts`):**
    a.  The Nuxt server receives the request.
    b.  It validates the user's permissions (i.e., if they have edit access).
    c.  It persists the new board state to the database, overwriting the previous state. This is a **"last-write-wins"** strategy.
    d.  **Crucially, it then makes a `POST` request to the external SSE service's broadcast endpoint** (e.g., `POST https://tackpad-sse.onrender.com/broadcast/[id]`), forwarding the exact same board data payload it just saved.

### Step 4: Receiving and Syncing on Other Clients

1.  **SSE Broadcast:** The SSE service receives the broadcast request from the Nuxt backend. It immediately pushes the data payload to every client currently connected to that board's SSE channel.
2.  **`onmessage` Event:** The `onmessage` handler in `pages/board/[id].client.vue` on all *other* clients fires.
3.  **State Synchronization:**
    *   The event handler parses the JSON data from the message.
    *   It calls a dedicated action in the Pinia store (e.g., `setBoardStateFromServer`).
    *   This action replaces the entire local board state with the new state received from the server. This ensures that all clients converge on the exact same state—the one most recently saved to the database.
4.  **Reactive UI Update:** As the Pinia store's state is updated, the Vue components on all clients reactively re-render to reflect the new, synchronized state.

## Summary of Key Concepts

*   **State Management (Pinia):** The store acts as the client-side single source of truth. It enables optimistic UI updates for the active user and provides a structured way to handle incoming state changes from the SSE server.
*   **Last-Write-Wins:** The synchronization model is simple and robust. The last successfully saved state becomes the canonical version for all clients. This avoids complex conflict resolution logic (CRDTs) but means simultaneous edits can be overwritten.
*   **Debouncing:** This is essential for performance. It batches rapid changes into a single save/broadcast operation, reducing server load and network traffic.
*   **Decoupled SSE Service:** Using an external SSE service simplifies the Nuxt application. The backend's responsibility is just to save data and then "fire-and-forget" a request to the SSE service to handle the real-time broadcasting.
*   **Data Flow:** The data flow is unidirectional and circular:
    `Client A Interaction` -> `Pinia (Local Update)` -> `Nuxt Backend (Save)` -> `SSE Service (Broadcast)` -> `Client B Pinia (Sync)` -> `Client B UI (Render)`


## Example Data
```{
    "title": "🌟 New Compelling Tackpad",
    "items": {
        "TODO-NIJQA4DT3A": {
            "id": "TODO-NIJQA4DT3A",
            "kind": "todo",
            "content": {
                "title": "Todo List",
                "tasks": [
                    {
                        "task_id": "TASK-X6AYJR6850",
                        "content": "item 2",
                        "completed": false
                    },
                    {
                        "task_id": "TASK-IGHAZFQYWO",
                        "content": "item 3",
                        "completed": false
                    }
                ]
            },
            "x_position": 486,
            "y_position": -13572,
            "width": 295.5,
            "height": 334.5,
            "displayName": "Todo 2"
        },
        "STICKY-RYCHRM6CMX": {
            "id": "STICKY-RYCHRM6CMX",
            "kind": "note",
            "content": {
                "text": "<p>Test</p>",
                "color": "#FFD700"
            },
            "x_position": 193,
            "y_position": -13531,
            "width": 216,
            "height": 216,
            "displayName": "Note 1"
        }
    }
}
```
