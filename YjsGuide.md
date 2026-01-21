# Technical Guide to Building Collaborative Applications with Yjs

This document provides a technical, generalized guide for implementing real-time, offline-first collaborative features using Yjs. It is intended for developers and AI agents to understand the core principles, architectural patterns, and specific APIs required. The concepts are illustrated with examples from a collaborative "Todo" application.

---

## 1. The Yjs Ecosystem: Core Primitives

A successful Yjs implementation relies on understanding its three main components: the Document, Shared Types, and Providers.

### 1.1. `Y.Doc`: The Heart of Collaboration

The `Y.Doc` is the central data structure in Yjs. It's a container for all shared data and manages the conflict-resolution (CRDT) algorithms that make collaboration seamless.

- **Concept**: Think of a `Y.Doc` as a client-side database. Each user has an identical copy of the `Y.Doc`. When one user makes a change, Yjs generates a tiny, efficient update message that is broadcast to all other users. Yjs guarantees that when these updates are applied, all documents will eventually reach the same state (eventual consistency).
- **Syntax**:
  ```javascript
  import * as Y from 'yjs';

  // A Y.Doc is created once per collaborative session.
  const ydoc = new Y.Doc();
  ```

### 1.2. Shared Types: The Data Structures

You don't store raw data directly in a `Y.Doc`. Instead, you use Yjs's shared data types, which are CRDT-enabled versions of common JavaScript data structures.

- **`Y.Map`**: For key-value data, similar to a JavaScript `Map`. Ideal for representing objects or records where you need to update specific fields.
  - **Use Case**: Storing a collection of data entities where each entity has a unique ID. In our example, a `Y.Map` named `'projects'` stores each `TodoProject` object, keyed by its unique `id`.
  - **Syntax**:
    ```javascript
    // Get a Y.Map named 'my-map' from the doc.
    const ymap = ydoc.getMap('my-map');

    // Set a value (this is a collaborative operation)
    ymap.set('user-profile', { name: 'Alice', role: 'admin' });

    // Get a value
    const profile = ymap.get('user-profile'); // Returns a plain JS object

    // Delete a key
    ymap.delete('user-profile');
    ```

- **`Y.Array`**: For list-based data, similar to a JavaScript `Array`.
  - **Use Case**: Storing an ordered list of items, like comments on a post or the todo items within a list.
  - **Syntax**:
    ```javascript
    const yarray = ydoc.getArray('my-list');

    // Add items
    yarray.push(['item1']); // Appends to the end

    // Insert at a specific index
    yarray.insert(0, ['item0']);

    // Delete items
    yarray.delete(1, 1); // Deletes 1 item at index 1

    // Get as a plain JS array
    const plainArray = yarray.toArray();
    ```

- **`Y.Text`**: For collaborative text editing, like Google Docs. It represents a string that can be modified concurrently by multiple users.

### 1.3. Providers: Connectivity & Persistence

Providers connect your `Y.Doc` to the outside world, enabling data synchronization and storage.

- **`WebsocketProvider`**: For real-time communication.
  - **Function**: Connects the `Y.Doc` to a WebSocket server. It listens for local changes to the doc, sends them to the server, and receives changes from other clients to apply locally.
  - **Key Feature: Awareness**: The `WebsocketProvider` includes an "awareness" protocol. This is used to broadcast ephemeral state that you don't want to store permanently in the `Y.Doc`, such as cursor positions, user presence (who is online), and current selections.
  - **Syntax**:
    ```javascript
    import { WebsocketProvider } from 'y-websocket';

    const wsProvider = new WebsocketProvider(
      'wss://your-websocket-server.com', // Server URL
      'my-document-room', // A name for the "room" or session
      ydoc // The Y.Doc to sync
    );

    // Get the awareness object
    const awareness = wsProvider.awareness;
    ```

- **`IndexeddbPersistence`**: For offline support.
  - **Function**: Automatically saves all updates to the `Y.Doc` in the browser's IndexedDB. When the application loads, it first populates the `Y.Doc` with the stored data from IndexedDB, allowing the user to work immediately, even without an internet connection. When the `WebsocketProvider` eventually connects, the `IndexeddbPersistence` provider ensures all offline changes are seamlessly synced.
  - **Syntax**:
    ```javascript
    import { IndexeddbPersistence } from 'y-indexeddb';

    const indexeddbProvider = new IndexeddbPersistence(
      'my-document-name', // A unique name for the local document
      ydoc
    );

    // You can listen for when the doc is synced from the DB
    indexeddbProvider.on('synced', () => {
      console.log('Content has been loaded from IndexedDB.');
    });
    ```

---

## 2. Architectural Pattern: A Layered Approach

For a robust and maintainable application, structure your Yjs implementation in layers.

1.  **Sync Layer (`useYjsSync.ts`)**: The lowest level. Responsible for creating and managing the lifecycle of the `Y.Doc` and its providers. It should expose methods to get shared types and perform transactions.
2.  **User Management Layer (`useUserManagement.ts`)**: Handles the identity of the *local user*. This is a precursor to any collaborative features.
3.  **State Management Layer (`useTodoStore.ts`)**: The application's logic center. It interacts with the Sync Layer to get shared types (`Y.Map`, `Y.Array`). It contains all the business logic for CRUD operations and uses an **observer pattern** to bridge Yjs data with the UI framework's reactivity system.
4.  **Collaboration Layer (`useCollaboration.ts`)**: Manages user-facing collaborative features, primarily by using the `awareness` protocol from the `WebsocketProvider`.
5.  **UI Layer (Vue Components)**: The top layer. It consumes reactive state from the State Management Layer and calls its methods to perform actions. It also consumes data from the Collaboration Layer to display things like online user avatars.

---

## 3. Feature Implementation Recipes

### Feature: Local User Initialization
This is the first step before any collaboration can happen. The application needs to identify the current user on their local device.

- **Functions Required**: `localStorage.getItem()`, `localStorage.setItem()`, `JSON.parse()`, `JSON.stringify()`
- **Logic**:
    1.  On application startup, attempt to load a user profile from browser `localStorage`.
    2.  If a profile exists, parse the JSON and use this as the current user's identity.
    3.  If no profile exists (a first-time user), generate a new identity. This typically involves creating a unique ID, a random display name, and a random color.
    4.  Save this new identity to `localStorage` as a JSON string so it will be available on the next visit.
- **Example (`useUserManagement.ts`)**:
    ```javascript
    function initializeCurrentUser() {
      const storedUser = localStorage.getItem('collab-app-user');
      if (storedUser) {
        currentUser.value = JSON.parse(storedUser);
      } else {
        currentUser.value = {
          id: crypto.randomUUID(),
          name: generateRandomName(),
          color: generateRandomColor()
        };
        localStorage.setItem('collab-app-user', JSON.stringify(currentUser.value));
      }
    }
    ```

### Feature: Real-time Data Synchronization
- **Functions Required**: `Y.Doc`, `Y.Map`/`Y.Array`, `WebsocketProvider`, `observe()`
- **Logic**:
    1.  Initialize the `Y.Doc` and `WebsocketProvider`.
    2.  In your state management layer, get a shared type: `const ymap = ydoc.getMap('data-store');`.
    3.  **Crucially**, attach an observer to the shared type. This function will be the bridge to your UI's reactivity.
        ```javascript
        // This function runs whenever 'ymap' is changed by anyone.
        const syncDataToUI = () => {
          const data = ymap.toJSON(); // Convert to plain JS object
          // Update your application's reactive state (e.g., Vue ref, React state)
          reactiveState.value = data;
        };
        ymap.observe(syncDataToUI);
        syncDataToUI(); // Perform an initial sync
        ```
    4.  All data modifications **must** be performed on the Yjs shared type, not the reactive state variable.

### Feature: Offline-First Support
- **Functions Required**: `IndexeddbPersistence`
- **Logic**:
    1.  In your Sync Layer, simply instantiate `IndexeddbPersistence` alongside the `WebsocketProvider`.
    2.  The provider handles everything automatically.
    3.  **Lookout For**: Ensure you wait for the `synced` event from the `IndexeddbPersistence` provider before assuming the application is fully loaded. This prevents race conditions where the UI might render before offline data is available.

### Feature: User Presence (Online Status & Avatars)
- **Functions Required**: `WebsocketProvider.awareness`, `awareness.setLocalStateField()`, `awareness.on('change')`
- **Prerequisite**: The local user must be initialized first (see above).
- **Logic**:
    1.  After initializing the `WebsocketProvider`, get the `awareness` object.
    2.  Broadcast the *initialized* local user's data.
        ```javascript
        // 'user' is a conventional key. The value is the object from local initialization.
        awareness.setLocalStateField('user', currentUser.value);
        ```
    3.  Listen for changes from all users and update the UI.
        ```javascript
        const updateActiveUsers = () => {
          const users = [];
          // awareness.getStates() returns a Map of all users' states
          awareness.getStates().forEach(state => {
            if (state.user) {
              users.push(state.user);
            }
          });
          // Update your UI's reactive list of active users
          activeUsersState.value = users;
        };
        awareness.on('change', updateActiveUsers);
        updateActiveUsers(); // Initial update
        ```

---

## 4. Technical Best Practices & Things to Lookout For

### The "Read-Modify-Write" Pattern for Objects
When updating a complex object stored within a `Y.Map`, you should treat the object as immutable.

- **Incorrect (Can lead to sync issues)**:
  ```javascript
  const project = ymap.get('project-1');
  project.name = 'New Name'; // This mutates a plain JS object, Yjs won't detect it.
  ymap.set('project-1', project); // This might not sync correctly.
  ```
- **Correct (The CRDT-friendly way)**:
  ```javascript
  const currentProject = ymap.get('project-1');
  const updatedProject = {
    ...currentProject,
    name: 'New Name', // Create a new object with the change
    updatedAt: Date.now()
  };
  ymap.set('project-1', updatedProject); // Set the new object.
  ```
**Why?** Yjs's `Y.Map` is optimized to diff the *entire object* you `.set()`. By providing a new object, you allow Yjs to efficiently calculate the minimal change and broadcast it. This atomic replacement is the foundation of its conflict-free merging for nested object structures.

### Always Use Transactions for Multiple Operations
If you need to perform several Yjs operations at once, wrap them in a transaction. This bundles them into a single, atomic update, which is more performant and prevents intermediate, possibly-invalid states from being shared.

- **Syntax**:
  ```javascript
  ydoc.transact(() => {
    yarray.insert(0, ['item 1']);
    ymap.set('status', 'updated');
  });
  ```

### Lifecycle Management
Yjs providers create connections and hold resources. It is critical to destroy them when they are no longer needed (e.g., when a user navigates away or a component is unmounted) to prevent memory leaks and unnecessary network activity.

- **Syntax**:
  ```javascript
  function cleanup() {
    wsProvider?.destroy();
    indexeddbProvider?.destroy();
    ydoc?.destroy();
  }
  ```
