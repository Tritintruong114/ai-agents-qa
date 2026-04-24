"""SQLite persistence for SEC 17a-4 test cases (stdlib sqlite3 only)."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "knowledge_base.db"

# Golden dataset — SEC 17a-4 WORM semantic harness (PRD + draft per case).
# Columns: id, title (case_description), category, text_chunk (draft_text),
#          expected_verdict, prd_context
_SEED_ROWS: list[tuple[str, str, str, str, str, str]] = [
    (
        "1",
        "UI-only hide/delete; archive untouched",
        "golden_pass",
        "Users can swipe to hide or delete this message from their mobile chat screen.",
        "PASS",
        "Messages are hidden from the local mobile view but remain in the SEC WORM archive for 7 years.",
    ),
    (
        "2",
        '"Purge" is device cache only, not the vault',
        "golden_pass",
        "The app purges local cache to free up device storage.",
        "PASS",
        "Local cache clears every 24h. Core vault remains untouched.",
    ),
    (
        "3",
        "Legally ambiguous wording",
        "golden_warning",
        "The system uses a retention clock to track message storage.",
        "WARNING",
        "Retention period starts from message creation.",
    ),
    (
        "4",
        "Missing audit caveat",
        "golden_warning",
        "Users can edit their sent messages within 15 minutes.",
        "WARNING",
        "Edited messages retain the original version in the immutable audit log.",
    ),
    (
        "5",
        "Early archive erase (before retention)",
        "golden_fail",
        "Organization super admins may permanently delete archived messages from the server, freeing storage immediately.",
        "FAIL",
        "Super-admins can force-delete warm-archive objects before the 7-year SEC window without court orders.",
    ),
    (
        "6",
        "Compliance sync disabled (subtle trap)",
        "golden_fail",
        "Admins can disable the compliance sync pipeline during maintenance windows.",
        "FAIL",
        "Sync pipelines can be paused by tenant admins, halting data flow to the SEC vault.",
    ),
]


def _ensure_test_cases_prd_context(conn: sqlite3.Connection) -> None:
    cur = conn.execute("PRAGMA table_info(test_cases)")
    cols = {row[1] for row in cur.fetchall()}
    if "prd_context" not in cols:
        conn.execute("ALTER TABLE test_cases ADD COLUMN prd_context TEXT NOT NULL DEFAULT ''")


def _ensure_golden_case_content_overrides(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS golden_case_content_overrides (
            test_case_id TEXT PRIMARY KEY,
            prd_context TEXT NOT NULL,
            text_chunk TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )


def _ensure_evaluation_log_extra_columns(conn: sqlite3.Connection) -> None:
    """Add columns for older DBs (confidence, routing) without losing data."""
    cur = conn.execute("PRAGMA table_info(evaluation_logs)")
    existing = {row[1] for row in cur.fetchall()}
    if "confidence_score" not in existing:
        conn.execute(
            "ALTER TABLE evaluation_logs ADD COLUMN confidence_score REAL"
        )
    if "routing_decision" not in existing:
        conn.execute(
            "ALTER TABLE evaluation_logs ADD COLUMN routing_decision TEXT"
        )
    if "evidence_quote" not in existing:
        conn.execute("ALTER TABLE evaluation_logs ADD COLUMN evidence_quote TEXT")


def init_db() -> None:
    """Create `knowledge_base.db` and the `test_cases` table if missing."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS test_cases (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                text_chunk TEXT NOT NULL,
                expected_verdict TEXT NOT NULL,
                prd_context TEXT NOT NULL DEFAULT ''
            )
            """
        )
        _ensure_test_cases_prd_context(conn)
        _ensure_golden_case_content_overrides(conn)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_case_id TEXT NOT NULL,
                temperature REAL NOT NULL,
                is_ui_description INTEGER NOT NULL,
                compliance_status TEXT NOT NULL,
                reasoning TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        _ensure_evaluation_log_extra_columns(conn)
        conn.commit()
    finally:
        conn.close()


def seed_data() -> None:
    """Upsert the 6 golden cases (ids 1–6) on every startup; keeps UI/API/DB aligned."""
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_test_cases_prd_context(conn)
        _ensure_golden_case_content_overrides(conn)
        conn.executemany(
            """
            INSERT OR REPLACE INTO test_cases
            (id, title, category, text_chunk, expected_verdict, prd_context)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            _SEED_ROWS,
        )
        conn.commit()
    finally:
        conn.close()


def insert_evaluation_log(
    test_case_id: str,
    temperature: float,
    is_ui_description: bool,
    compliance_status: str,
    reasoning: str,
    prompt_tokens: int,
    completion_tokens: int,
    *,
    confidence_score: float | None = None,
    routing_decision: str | None = None,
    evidence_quote: str | None = None,
) -> int:
    """Persist one AI evaluation run for audit trail. Returns new row id."""
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_evaluation_log_extra_columns(conn)
        cur = conn.execute(
            """
            INSERT INTO evaluation_logs (
                test_case_id, temperature, is_ui_description,
                compliance_status, reasoning, prompt_tokens, completion_tokens,
                confidence_score, routing_decision, evidence_quote
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                test_case_id,
                temperature,
                1 if is_ui_description else 0,
                compliance_status,
                reasoning,
                prompt_tokens,
                completion_tokens,
                confidence_score,
                routing_decision,
                evidence_quote,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def fetch_test_case_by_id(item_id: str) -> dict | None:
    """Return one merged row (canonical + optional golden content overrides), or None."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_golden_case_content_overrides(conn)
        cur = conn.execute(
            """
            SELECT
                t.id,
                t.title,
                t.category,
                t.expected_verdict,
                CASE
                    WHEN o.test_case_id IS NOT NULL THEN o.prd_context
                    ELSE COALESCE(t.prd_context, '')
                END AS prd_context,
                CASE
                    WHEN o.test_case_id IS NOT NULL THEN o.text_chunk
                    ELSE t.text_chunk
                END AS text_chunk
            FROM test_cases t
            LEFT JOIN golden_case_content_overrides o
                ON o.test_case_id = t.id
            WHERE t.id = ?
            """,
            (item_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return {k: row[k] for k in row.keys()}
    finally:
        conn.close()


def upsert_golden_case_content_override(
    test_case_id: str,
    prd_context: str,
    text_chunk: str,
) -> None:
    """Persist user-edited PRD + draft; survives seed_data() which only replaces test_cases."""
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_golden_case_content_overrides(conn)
        cur = conn.execute("SELECT 1 FROM test_cases WHERE id = ?", (test_case_id,))
        if cur.fetchone() is None:
            raise ValueError(f"Unknown test_case_id: {test_case_id!r}")
        conn.execute(
            """
            INSERT INTO golden_case_content_overrides
                (test_case_id, prd_context, text_chunk, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(test_case_id) DO UPDATE SET
                prd_context = excluded.prd_context,
                text_chunk = excluded.text_chunk,
                updated_at = excluded.updated_at
            """,
            (test_case_id, prd_context, text_chunk),
        )
        conn.commit()
    finally:
        conn.close()


def get_anti_patterns(limit: int = 20) -> list[dict]:
    """Rows from evaluation_logs where status is FAIL or WARNING, newest first."""
    lim = max(1, min(int(limit), 500))
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT id, test_case_id, temperature, is_ui_description,
                   compliance_status, reasoning, prompt_tokens, completion_tokens,
                   created_at, confidence_score, routing_decision, evidence_quote
            FROM evaluation_logs
            WHERE compliance_status IN ('FAIL', 'WARNING')
            ORDER BY datetime(created_at) DESC
            LIMIT ?
            """,
            (lim,),
        )
        out: list[dict] = []
        for row in cur.fetchall():
            d = {k: row[k] for k in row.keys()}
            d["is_ui_description"] = bool(d["is_ui_description"])
            out.append(d)
        return out
    finally:
        conn.close()
