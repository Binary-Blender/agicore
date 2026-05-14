// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Integration tests generated from TEST declarations.

#[cfg(test)]
mod entity_tests {
    use rusqlite::Connection;
    use uuid::Uuid;

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(include_str!("../migrations/001_initial.sql"))
            .expect("migration failed");
        conn
    }

    #[test]
    fn user_crud() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai", name: "Test User" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), "Test User".to_string(), &now, &now],
        ).expect("insert User");

        // EXPECT create -> id IS NOT NULL
        assert!(!user_id.is_empty(), "id should not be empty");
        // EXPECT create -> email == test@novasyn.ai
        let email_val: String = conn.query_row(
            "SELECT email FROM users WHERE id = ?", [&user_id],
            |r| r.get(0)).expect("query email");
        assert_eq!(email_val, "test@novasyn.ai".to_string(), "email should be test@novasyn.ai");
    }

    #[test]
    fn session_crud() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), &now, &now],
        ).expect("insert User");

        // GIVEN Session { name: "Test Session" }
        let session_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO sessions (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&session_id, "Test Session".to_string(), &user_id, &now, &now],
        ).expect("insert Session");

        // EXPECT create -> id IS NOT NULL
        assert!(!session_id.is_empty(), "id should not be empty");
        // EXPECT create -> name == Test Session
        let name_val: String = conn.query_row(
            "SELECT name FROM sessions WHERE id = ?", [&session_id],
            |r| r.get(0)).expect("query name");
        assert_eq!(name_val, "Test Session".to_string(), "name should be Test Session");
    }

    #[test]
    fn folder_hierarchy() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), &now, &now],
        ).expect("insert User");

        // GIVEN Folder { name: "Root Folder" }
        let folder_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO folders (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&folder_id, "Root Folder".to_string(), &user_id, &now, &now],
        ).expect("insert Folder");

        // GIVEN FolderItem { content: "Test content", tokens: 50 }
        let folder_item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO folder_items (id, content, tokens, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![&folder_item_id, "Test content".to_string(), 50, &folder_id, &now, &now],
        ).expect("insert FolderItem");

        // EXPECT create -> id IS NOT NULL
        assert!(!folder_item_id.is_empty(), "id should not be empty");
        // EXPECT create -> tokens == 50
        let tokens_val: i64 = conn.query_row(
            "SELECT tokens FROM folder_items WHERE id = ?", [&folder_item_id],
            |r| r.get(0)).expect("query tokens");
        assert_eq!(tokens_val, 50, "tokens should be 50");
    }

    #[test]
    fn chat_message_flow() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), &now, &now],
        ).expect("insert User");

        // GIVEN Session { name: "Chat Session" }
        let session_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO sessions (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&session_id, "Chat Session".to_string(), &user_id, &now, &now],
        ).expect("insert Session");

        // GIVEN ChatMessage { user_message: "Hello", ai_message: "Hi there", user_tokens: 5, ai_tokens: 10, total_tokens: 15, model: "claude-sonnet-4-20250514", provider: "anthropic" }
        let chat_message_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO chat_messages (id, user_message, ai_message, user_tokens, ai_tokens, total_tokens, model, provider, user_id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![&chat_message_id, "Hello".to_string(), "Hi there".to_string(), 5, 10, 15, "claude-sonnet-4-20250514".to_string(), "anthropic".to_string(), &user_id, &session_id, &now, &now],
        ).expect("insert ChatMessage");

        // EXPECT create -> id IS NOT NULL
        assert!(!chat_message_id.is_empty(), "id should not be empty");
        // EXPECT create -> total_tokens == 15
        let total_tokens_val: i64 = conn.query_row(
            "SELECT total_tokens FROM chat_messages WHERE id = ?", [&chat_message_id],
            |r| r.get(0)).expect("query total_tokens");
        assert_eq!(total_tokens_val, 15, "total_tokens should be 15");
        // EXPECT create -> is_excluded == false
        let is_excluded_val: i64 = conn.query_row(
            "SELECT is_excluded FROM chat_messages WHERE id = ?", [&chat_message_id],
            |r| r.get(0)).expect("query is_excluded");
        assert_eq!(is_excluded_val, 0, "is_excluded should be false");
    }

    #[test]
    fn tag_system() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), &now, &now],
        ).expect("insert User");

        // GIVEN Tag { name: "Important", color: "#EF4444" }
        let tag_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tags (id, name, color, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![&tag_id, "Important".to_string(), "#EF4444".to_string(), &user_id, &now, &now],
        ).expect("insert Tag");

        // EXPECT create -> id IS NOT NULL
        assert!(!tag_id.is_empty(), "id should not be empty");
        // EXPECT create -> color == #EF4444
        let color_val: String = conn.query_row(
            "SELECT color FROM tags WHERE id = ?", [&tag_id],
            |r| r.get(0)).expect("query color");
        assert_eq!(color_val, "#EF4444".to_string(), "color should be #EF4444");
        // EXPECT create -> usage_count == 0
        let usage_count_val: i64 = conn.query_row(
            "SELECT usage_count FROM tags WHERE id = ?", [&tag_id],
            |r| r.get(0)).expect("query usage_count");
        assert_eq!(usage_count_val, 0, "usage_count should be 0");
    }

    #[test]
    fn exchange_saving() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = &now;

        // GIVEN User { email: "test@novasyn.ai" }
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
            rusqlite::params![&user_id, "test@novasyn.ai".to_string(), &now, &now],
        ).expect("insert User");

        // GIVEN Exchange { prompt: "How do I...", response: "You can...", model: "claude-sonnet-4-20250514", provider: "anthropic" }
        let exchange_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO exchanges (id, prompt, response, model, provider, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![&exchange_id, "How do I...".to_string(), "You can...".to_string(), "claude-sonnet-4-20250514".to_string(), "anthropic".to_string(), &user_id, &now, &now],
        ).expect("insert Exchange");

        // EXPECT create -> id IS NOT NULL
        assert!(!exchange_id.is_empty(), "id should not be empty");
        // EXPECT create -> success == true
        let success_val: i64 = conn.query_row(
            "SELECT success FROM exchanges WHERE id = ?", [&exchange_id],
            |r| r.get(0)).expect("query success");
        assert_eq!(success_val, 1, "success should be true");
    }

}
