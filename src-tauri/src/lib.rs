mod storage;

use tauri_plugin_sql::{Builder, Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let test_migrations = vec![
        // Define your migrations here
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT);
                CREATE TABLE test (id INTEGER PRIMARY KEY, test TEXT);",
            kind: MigrationKind::Up,
        },
    ];

    let nai_ats_migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "CREATE TABLE tags (
                    id                  INTEGER PRIMARY KEY,
                    value               TEXT NOT NULL UNIQUE,
                    clothing_default    INTEGER NOT NULL CHECK (clothing_default IN (0, 1)) --default value for clothing
                );

                CREATE TABLE characters (
                    id          INTEGER PRIMARY KEY,
                    name        TEXT NOT NULL, -- gender and character count are read from the character's tags
                    description TEXT NOT NULL DEFAULT ''
                );

                CREATE TABLE character_tag (
                    character_id      INTEGER NOT NULL,
                    tag_id            INTEGER NOT NULL,
                    position          INTEGER NOT NULL,
                    clothing_override INTEGER NULL CHECK (clothing_override IN (0, 1)), --read with COALESCE(character_tag.clothing_override, tags.clothing_default)
                    area              TEXT NOT NULL CHECK (area IN ('general', 'head', 'torso', 'legs')),
                    side              TEXT,
                    CHECK (
                        (area = 'general' AND side IS NULL)
                        OR
                        (area != 'general' AND side IN ('front', 'back', 'both')) --'both' can be used for hair and necklaces
                    ),

                    PRIMARY KEY (character_id, tag_id), -- no duplicate tags allowed

                    FOREIGN KEY (character_id) REFERENCES characters(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT
                );

                CREATE TABLE character_undesired_tag (
                    character_id INTEGER NOT NULL,
                    tag_id       INTEGER NOT NULL,
                    position     INTEGER NOT NULL,

                    PRIMARY KEY (character_id, tag_id),

                    FOREIGN KEY (character_id) REFERENCES characters(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT
                );

                CREATE TABLE scenarios (
                    id          INTEGER PRIMARY KEY,
                    name        TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    clothing    INTEGER NOT NULL CHECK (clothing IN (0, 1)), -- if 0, clothing tags are left out of the prompt
                    quality     TEXT NOT NULL DEFAULT 'standard' CHECK (quality IN ('standard', 'none')),
                    uc_preset   TEXT NOT NULL DEFAULT 'heavy'
                );

                INSERT INTO scenarios (id, name, clothing) VALUES (1, 'Default', 1);

                CREATE TABLE scenario_character (
                    scenario_id   INTEGER NOT NULL,
                    character_id  INTEGER NULL, -- null if the character was deleted
                    character_idx INTEGER NOT NULL CHECK (character_idx >= 0),
                    active        INTEGER NOT NULL CHECK (active IN (0, 1)),
                    -- which parts of the character are visible in the scenario
                    show_general  INTEGER NOT NULL DEFAULT 1 CHECK (show_general IN (0, 1)),
                    show_head     INTEGER NOT NULL DEFAULT 1 CHECK (show_head IN (0, 1)),
                    show_torso    INTEGER NOT NULL DEFAULT 1 CHECK (show_torso IN (0, 1)),
                    show_legs     INTEGER NOT NULL DEFAULT 1 CHECK (show_legs IN (0, 1)),
                    show_front    INTEGER NOT NULL DEFAULT 1 CHECK (show_front IN (0, 1)),
                    show_back     INTEGER NOT NULL DEFAULT 1 CHECK (show_back IN (0, 1)),

                    PRIMARY KEY (scenario_id, character_idx),

                    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (character_id) REFERENCES characters(id)
                        ON DELETE SET NULL --deleting a character leaves an empty slot
                );

                CREATE TABLE scenario_tag (
                    scenario_id   INTEGER NOT NULL,
                    tag_id        INTEGER NOT NULL,
                    category      TEXT NOT NULL CHECK (category IN ('base', 'base_clothing', 'character_shared', 'character_unique')),
                    character_idx INTEGER, --the character's position in the scenario, if applicable
                    position      INTEGER NOT NULL DEFAULT 0,

                    CHECK (
                        (category = 'character_unique' AND character_idx IS NOT NULL)
                        OR
                        (category != 'character_unique' AND character_idx IS NULL)
                    ),

                    PRIMARY KEY (scenario_id, tag_id, category, character_idx),

                    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT,
                    FOREIGN KEY (scenario_id, character_idx)
                        REFERENCES scenario_character(scenario_id, character_idx)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE --reordering characters moves their unique tags with them
                );

                CREATE UNIQUE INDEX scenario_tag_unique_without_character --null character_idx makes every row unique otherwise
                    ON scenario_tag (scenario_id, tag_id, category)
                    WHERE character_idx IS NULL;

                CREATE TABLE scenario_undesired_tag (
                    scenario_id   INTEGER NOT NULL,
                    tag_id        INTEGER NOT NULL,
                    category      TEXT NOT NULL CHECK (category IN ('base', 'character_shared', 'character_unique')),
                    character_idx INTEGER,
                    position      INTEGER NOT NULL DEFAULT 0,

                    CHECK (
                        (category = 'character_unique' AND character_idx IS NOT NULL)
                        OR
                        (category != 'character_unique' AND character_idx IS NULL)
                    ),

                    PRIMARY KEY (scenario_id, tag_id, category, character_idx),

                    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT,
                    FOREIGN KEY (scenario_id, character_idx)
                        REFERENCES scenario_character(scenario_id, character_idx)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                );

                CREATE UNIQUE INDEX scenario_undesired_tag_unique_without_character
                    ON scenario_undesired_tag (scenario_id, tag_id, category)
                    WHERE character_idx IS NULL;

                CREATE TABLE images (
                    id            INTEGER PRIMARY KEY,
                    relative_path TEXT NOT NULL,
                    seed          INTEGER NOT NULL,
                    favourite     INTEGER NOT NULL DEFAULT 0 CHECK (favourite IN (0, 1))
                );

                CREATE TABLE generations (
                    id              INTEGER PRIMARY KEY,
                    parameters_json TEXT NOT NULL CHECK (json_valid(parameters_json)),
                    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    scenario_id     INTEGER NULL,
                    width           INTEGER NOT NULL,
                    height          INTEGER NOT NULL,

                    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
                        ON DELETE SET NULL --deleting a scenario keeps its generations
                );

                CREATE TABLE generation_image (
                    generation_id INTEGER NOT NULL,
                    image_id      INTEGER NOT NULL,

                    PRIMARY KEY (generation_id, image_id),

                    FOREIGN KEY (generation_id) REFERENCES generations(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (image_id) REFERENCES images(id)
                        ON DELETE RESTRICT --delete the generation instead
                );

                -- when a generation is deleted, its generation_image rows cascade away,
                -- then this removes any image no other generation still uses.
                -- the image FILE on disk still has to be deleted by the app.
                CREATE TRIGGER delete_orphan_images
                AFTER DELETE ON generation_image
                BEGIN
                    DELETE FROM images
                    WHERE id = OLD.image_id
                      AND NOT EXISTS (SELECT 1 FROM generation_image WHERE image_id = OLD.image_id);
                END;

                CREATE TABLE generation_character (
                    generation_id INTEGER NOT NULL,
                    character_id  INTEGER NULL,
                    character_idx INTEGER NOT NULL,

                    PRIMARY KEY (generation_id, character_idx), -- allow duplicate characters by making pk on idx

                    FOREIGN KEY (generation_id) REFERENCES generations(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (character_id) REFERENCES characters(id)
                        ON DELETE SET NULL
                );

                -- the positive tags sent with a generation, for gallery search
                CREATE TABLE generation_tag (
                    generation_id INTEGER NOT NULL,
                    tag_id        INTEGER NOT NULL,

                    PRIMARY KEY (generation_id, tag_id),

                    FOREIGN KEY (generation_id) REFERENCES generations(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT
                );

                CREATE INDEX generation_tag_by_tag ON generation_tag (tag_id);",
        kind: MigrationKind::Up,
    },
    Migration {
        version: 2,
        description: "sessions",
        sql: "CREATE TABLE sessions (
                    id          INTEGER PRIMARY KEY,
                    name        TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT ''
                );

                INSERT INTO sessions (id, name) VALUES (1, 'Session 1');

                -- history is grouped by session, not by scenario
                ALTER TABLE generations ADD COLUMN session_id INTEGER NULL REFERENCES sessions(id) ON DELETE SET NULL;
                UPDATE generations SET session_id = 1;

                -- the 'All' area is always visible
                ALTER TABLE scenario_character DROP COLUMN show_general;",
        kind: MigrationKind::Up,
    },
    Migration {
        version: 3,
        description: "clothing_mutual_exclusive",
        sql: "-- 1 if the tag is only used while clothing tags are left out of the prompt
                ALTER TABLE character_tag ADD COLUMN clothing_mutual_exclusive INTEGER NOT NULL DEFAULT 0 CHECK (clothing_mutual_exclusive IN (0, 1));
                ALTER TABLE character_tag DROP COLUMN clothing_override;
                ALTER TABLE tags DROP COLUMN clothing_default;",
        kind: MigrationKind::Up,
    },
    Migration {
        version: 4,
        description: "simple_character_areas",
        sql: "CREATE TABLE character_tag_new (
                    character_id INTEGER NOT NULL,
                    tag_id       INTEGER NOT NULL,
                    position     INTEGER NOT NULL,
                    area         TEXT NOT NULL CHECK (area IN ('all', 'clothing', 'no_clothing', 'upper', 'lower')),

                    PRIMARY KEY (character_id, tag_id),

                    FOREIGN KEY (character_id) REFERENCES characters(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT
                );

                INSERT INTO character_tag_new (character_id, tag_id, position, area)
                SELECT character_id, tag_id,
                       ROW_NUMBER() OVER (PARTITION BY character_id, new_area ORDER BY instr('general head torso legs', area), instr('front back both', side), position) - 1,
                       new_area
                FROM (
                    SELECT *, CASE
                        WHEN clothing_mutual_exclusive = 1 THEN 'no_clothing'
                        WHEN area = 'general' THEN 'all'
                        WHEN area IN ('head', 'torso') THEN 'upper'
                        ELSE 'lower'
                    END AS new_area
                    FROM character_tag
                );

                DROP TABLE character_tag;
                ALTER TABLE character_tag_new RENAME TO character_tag;

                -- the default character can't be deleted; slots fall back to it
                ALTER TABLE characters ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1));
                CREATE UNIQUE INDEX one_default_character ON characters (is_default) WHERE is_default = 1;
                INSERT INTO characters (name, is_default) VALUES ('Default character', 1);

                ALTER TABLE scenario_character ADD COLUMN show_upper INTEGER NOT NULL DEFAULT 1 CHECK (show_upper IN (0, 1));
                ALTER TABLE scenario_character ADD COLUMN show_lower INTEGER NOT NULL DEFAULT 1 CHECK (show_lower IN (0, 1));
                UPDATE scenario_character SET
                    show_upper = (show_head OR show_torso),
                    show_lower = show_legs,
                    character_id = COALESCE(character_id, (SELECT id FROM characters WHERE is_default = 1));
                ALTER TABLE scenario_character DROP COLUMN show_head;
                ALTER TABLE scenario_character DROP COLUMN show_torso;
                ALTER TABLE scenario_character DROP COLUMN show_legs;
                ALTER TABLE scenario_character DROP COLUMN show_front;
                ALTER TABLE scenario_character DROP COLUMN show_back;

                -- base clothing and per-scenario positive character tags are gone
                DELETE FROM scenario_tag WHERE category IN ('base_clothing', 'character_unique');

                ALTER TABLE generations DROP COLUMN session_id;
                DROP TABLE sessions;",
        kind: MigrationKind::Up,
    },
    Migration {
        version: 5,
        description: "tag_line_breaks",
        sql: "-- how many line breaks come before the tag in its text box
                ALTER TABLE character_tag ADD COLUMN line_breaks INTEGER NOT NULL DEFAULT 0 CHECK (line_breaks >= 0);
                ALTER TABLE character_undesired_tag ADD COLUMN line_breaks INTEGER NOT NULL DEFAULT 0 CHECK (line_breaks >= 0);
                ALTER TABLE scenario_tag ADD COLUMN line_breaks INTEGER NOT NULL DEFAULT 0 CHECK (line_breaks >= 0);
                ALTER TABLE scenario_undesired_tag ADD COLUMN line_breaks INTEGER NOT NULL DEFAULT 0 CHECK (line_breaks >= 0);",
        kind: MigrationKind::Up,
    },
    Migration {
        version: 6,
        description: "prompt_chunks",
        sql: "CREATE TABLE saved_chunks (
                    id         INTEGER PRIMARY KEY,
                    text       TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                );

                -- each character becomes a /c chunk of all its positive tags
                INSERT INTO saved_chunks (text)
                SELECT '/c' || char(10) || group_concat(t.value, ', ' ORDER BY
                           CASE ct.area WHEN 'all' THEN 0 WHEN 'clothing' THEN 1 WHEN 'no_clothing' THEN 2 WHEN 'upper' THEN 3 ELSE 4 END,
                           ct.position)
                FROM characters c
                JOIN character_tag ct ON ct.character_id = c.id
                JOIN tags t ON t.id = ct.tag_id
                GROUP BY c.id
                ORDER BY c.id;

                -- each scenario becomes its base, shared and per slot tags as separate chunks
                WITH scenario_chunks AS (
                    SELECT st.scenario_id,
                           CASE st.category WHEN 'base' THEN -2 WHEN 'character_shared' THEN -1 ELSE st.character_idx END AS chunk_order,
                           group_concat(t.value, ', ' ORDER BY st.position) AS text
                    FROM scenario_tag st
                    JOIN tags t ON t.id = st.tag_id
                    GROUP BY st.scenario_id, chunk_order
                )
                INSERT INTO saved_chunks (text)
                SELECT group_concat(text, char(10) || char(10) ORDER BY chunk_order)
                FROM scenario_chunks
                GROUP BY scenario_id
                ORDER BY scenario_id;

                -- the editor text a generation was made from, rebuilt from the request for older generations
                ALTER TABLE generations ADD COLUMN prompt_text TEXT NOT NULL DEFAULT '';
                UPDATE generations SET prompt_text =
                    CASE WHEN json_extract(parameters_json, '$.backend') = 'comfyui' THEN
                        json_extract(parameters_json, '$.prompt')
                        || CASE WHEN json_extract(parameters_json, '$.negative') != ''
                               THEN char(10) || char(10) || '/u' || char(10) || json_extract(parameters_json, '$.negative') ELSE '' END
                    ELSE
                        json_extract(parameters_json, '$.input')
                        || coalesce((
                            SELECT group_concat(
                                char(10) || char(10) || '/c' || char(10) || json_extract(value, '$.prompt')
                                || CASE WHEN json_extract(value, '$.uc') != '' THEN char(10) || '/u' || char(10) || json_extract(value, '$.uc') ELSE '' END,
                                '' ORDER BY key)
                            FROM json_each(parameters_json, '$.parameters.characterPrompts')), '')
                        || CASE WHEN json_extract(parameters_json, '$.parameters.negative_prompt') != ''
                               THEN char(10) || char(10) || '/u' || char(10) || json_extract(parameters_json, '$.parameters.negative_prompt') ELSE '' END
                    END;

                DROP TABLE generation_character;

                -- scenario_id can't be dropped while it has a foreign key, so generations is rebuilt.
                -- the tables pointing at it are set aside first so dropping it doesn't cascade into them
                DROP TRIGGER delete_orphan_images;
                CREATE TABLE generation_image_copy AS SELECT * FROM generation_image;
                CREATE TABLE generation_tag_copy AS SELECT * FROM generation_tag;
                DROP TABLE generation_image;
                DROP TABLE generation_tag;

                CREATE TABLE generations_new (
                    id              INTEGER PRIMARY KEY,
                    parameters_json TEXT NOT NULL CHECK (json_valid(parameters_json)),
                    prompt_text     TEXT NOT NULL,
                    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    width           INTEGER NOT NULL,
                    height          INTEGER NOT NULL
                );
                INSERT INTO generations_new (id, parameters_json, prompt_text, created_at, width, height)
                SELECT id, parameters_json, prompt_text, created_at, width, height FROM generations;
                DROP TABLE generations;
                ALTER TABLE generations_new RENAME TO generations;

                CREATE TABLE generation_image (
                    generation_id INTEGER NOT NULL,
                    image_id      INTEGER NOT NULL,

                    PRIMARY KEY (generation_id, image_id),

                    FOREIGN KEY (generation_id) REFERENCES generations(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (image_id) REFERENCES images(id)
                        ON DELETE RESTRICT --delete the generation instead
                );
                INSERT INTO generation_image SELECT * FROM generation_image_copy;
                DROP TABLE generation_image_copy;

                CREATE TABLE generation_tag (
                    generation_id INTEGER NOT NULL,
                    tag_id        INTEGER NOT NULL,

                    PRIMARY KEY (generation_id, tag_id),

                    FOREIGN KEY (generation_id) REFERENCES generations(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE RESTRICT
                );
                CREATE INDEX generation_tag_by_tag ON generation_tag (tag_id);
                INSERT INTO generation_tag SELECT * FROM generation_tag_copy;
                DROP TABLE generation_tag_copy;

                CREATE TRIGGER delete_orphan_images
                AFTER DELETE ON generation_image
                BEGIN
                    DELETE FROM images
                    WHERE id = OLD.image_id
                      AND NOT EXISTS (SELECT 1 FROM generation_image WHERE image_id = OLD.image_id);
                END;

                DROP TABLE scenario_undesired_tag;
                DROP TABLE scenario_tag;
                DROP TABLE scenario_character;
                DROP TABLE scenarios;
                DROP TABLE character_undesired_tag;
                DROP TABLE character_tag;
                DROP TABLE characters;",
        kind: MigrationKind::Up,
    }];

    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        //plugins
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:nai_ats.db", nai_ats_migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, storage::storage_usage, storage::delete_database, storage::restart_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
