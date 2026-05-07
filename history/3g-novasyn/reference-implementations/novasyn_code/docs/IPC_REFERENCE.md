# NovaSyn Code IPC Channel Reference

All communication between the Electron main process and the React renderer passes through typed IPC channels exposed via the preload script's `contextBridge`. Channels follow the namespace pattern `domain:action`.

---

## Window Management

| Channel              | Direction       | Payload              | Response     | Description                        |
|----------------------|-----------------|----------------------|--------------|------------------------------------|
| `window:minimize`    | Renderer -> Main | --                  | --           | Minimize the app window            |
| `window:maximize`    | Renderer -> Main | --                  | --           | Toggle maximize/restore            |
| `window:close`       | Renderer -> Main | --                  | --           | Close the app window               |
| `window:is-maximized`| Renderer -> Main | --                  | `boolean`    | Check if window is maximized       |

---

## Projects

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `project:list`         | Renderer -> Main | --                              | `Project[]`           | List all projects                  |
| `project:create`       | Renderer -> Main | `{ name, path }`                | `Project`             | Create a new project               |
| `project:open`         | Renderer -> Main | `{ id }`                        | `Project`             | Set a project as active            |
| `project:delete`       | Renderer -> Main | `{ id }`                        | `void`                | Delete a project                   |
| `project:select-folder`| Renderer -> Main | --                              | `string \| null`      | Open native folder picker dialog   |

---

## Sessions

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `session:list`         | Renderer -> Main | `{ projectId }`                 | `Session[]`           | List sessions for a project        |
| `session:create`       | Renderer -> Main | `{ projectId, title? }`        | `Session`             | Create a new chat session          |
| `session:update`       | Renderer -> Main | `{ id, title?, systemPrompt? }`| `Session`             | Update session properties          |
| `session:delete`       | Renderer -> Main | `{ id }`                        | `void`                | Delete a session and its messages  |
| `session:set-active`   | Renderer -> Main | `{ id }`                        | `Session`             | Set a session as active            |

---

## Chat Messages

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `chat:send`            | Renderer -> Main | `{ sessionId, content }`       | --                    | Send a user message, triggers AI   |
| `chat:stream`          | Main -> Renderer | `{ sessionId, chunk, done }`   | --                    | Stream AI response chunks          |
| `chat:history`         | Renderer -> Main | `{ sessionId }`                | `ChatMessage[]`       | Load all messages for a session    |
| `chat:stop`            | Renderer -> Main | `{ sessionId }`                | `void`                | Abort an in-progress AI response   |
| `chat:delete-message`  | Renderer -> Main | `{ id }`                        | `void`                | Delete a specific message          |
| `chat:error`           | Main -> Renderer | `{ sessionId, error }`         | --                    | Report an AI/chat error            |

---

## File System

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `fs:read-tree`         | Renderer -> Main | `{ rootPath }`                 | `FileTreeNode[]`      | Read directory tree structure      |
| `fs:read-file`         | Renderer -> Main | `{ filePath }`                 | `{ content, encoding }` | Read file contents               |
| `fs:write-file`        | Renderer -> Main | `{ filePath, content }`        | `void`                | Write content to a file            |
| `fs:create-file`       | Renderer -> Main | `{ filePath, content? }`       | `void`                | Create a new file                  |
| `fs:delete-file`       | Renderer -> Main | `{ filePath }`                 | `void`                | Delete a file                      |
| `fs:rename`            | Renderer -> Main | `{ oldPath, newPath }`         | `void`                | Rename/move a file or directory    |
| `fs:create-directory`  | Renderer -> Main | `{ dirPath }`                  | `void`                | Create a new directory             |
| `fs:watch-start`       | Renderer -> Main | `{ rootPath }`                 | `void`                | Start chokidar watcher on a path   |
| `fs:watch-stop`        | Renderer -> Main | `{ rootPath }`                 | `void`                | Stop chokidar watcher              |
| `fs:watch-event`       | Main -> Renderer | `{ event, path }`              | --                    | File system change notification    |

---

## Terminal

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `terminal:create`      | Renderer -> Main | `{ shell?, cwd? }`             | `{ id }`              | Spawn a new terminal process       |
| `terminal:input`       | Renderer -> Main | `{ id, data }`                 | --                    | Send keystrokes to terminal        |
| `terminal:output`      | Main -> Renderer | `{ id, data }`                 | --                    | Terminal output data               |
| `terminal:resize`      | Renderer -> Main | `{ id, cols, rows }`           | --                    | Resize terminal dimensions         |
| `terminal:close`       | Renderer -> Main | `{ id }`                       | `void`                | Kill terminal process              |
| `terminal:exit`        | Main -> Renderer | `{ id, exitCode }`             | --                    | Terminal process exited            |
| `terminal:list-shells` | Renderer -> Main | --                              | `ShellInfo[]`         | List available shells              |

---

## Settings

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `settings:get`         | Renderer -> Main | `{ key }`                      | `any`                 | Get a setting value                |
| `settings:get-all`     | Renderer -> Main | --                              | `Record<string, any>` | Get all settings                  |
| `settings:set`         | Renderer -> Main | `{ key, value }`               | `void`                | Set a setting value                |
| `settings:reset`       | Renderer -> Main | `{ key }`                      | `void`                | Reset a setting to default         |

---

## Context (Sprint 5)

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `context:add-folder`   | Renderer -> Main | `{ sessionId, folderPath }`    | `ContextItem`         | Add a folder as context            |
| `context:add-file`     | Renderer -> Main | `{ sessionId, filePath }`      | `ContextItem`         | Add a file as context              |
| `context:remove`       | Renderer -> Main | `{ sessionId, itemId }`        | `void`                | Remove a context item              |
| `context:list`         | Renderer -> Main | `{ sessionId }`                | `ContextItem[]`       | List context items for a session   |
| `context:token-count`  | Renderer -> Main | `{ sessionId }`                | `{ used, limit }`     | Get token budget usage             |

---

## Macros / Cross-App (Sprint 6)

| Channel                | Direction       | Payload                          | Response              | Description                        |
|------------------------|-----------------|----------------------------------|-----------------------|------------------------------------|
| `macro:register`       | Main internal   | `{ actions[] }`                 | --                    | Register receivable actions        |
| `macro:receive`        | Main -> Renderer | `{ action, payload, sourceApp }` | --                   | Incoming macro task from another app|
| `macro:dispatch`       | Renderer -> Main | `{ targetApp, action, payload }`| `void`               | Send a macro to another app        |
| `macro:result`         | Renderer -> Main | `{ macroId, result }`           | `void`               | Report result of a received macro  |

---

## Type Definitions

```typescript
interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

interface Session {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  systemPrompt: string;
  model: string;
  metadata: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  tokenCount: number;
  model: string | null;
  metadata: Record<string, unknown>;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface ShellInfo {
  name: string;
  path: string;
  args?: string[];
}

interface ContextItem {
  id: string;
  sessionId: string;
  type: 'folder' | 'file';
  path: string;
  tokenCount: number;
  tags: string[];
}
```
