"""SQLite persistence for SEC 17a-4 test cases (stdlib sqlite3 only)."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "knowledge_base.db"

# Hardcoded seed — same 6 cases as former mock_data.json + title + expected_verdict
_SEED_ROWS: list[tuple[str, str, str, str, str]] = [
    (
        "1",
        "UI Deletion Button",
        "false_positive",
        "The “Delete message” control is in the top-right of the screen. An admin can tap it to hide the message from the current workspace view.",
        "PASS",
    ),
    (
        "2",
        "Retention Clock (IT Jargon)",
        "false_positive",
        "The system retention clock starts when a message is loaded into the UI buffer.",
        "PASS",
    ),
    (
        "3",
        "Display Retention Window (View Config)",
        "false_positive",
        "Admins can set the displayed retention period on the app screen between 30 and 90 days.",
        "PASS",
    ),
    (
        "4",
        "WORM Data Deletion (SEC 17a-4 Violation)",
        "true_positive",
        "The system allows senior admins to permanently delete records in the WORM vault when the customer requests it directly.",
        "FAIL",
    ),
    (
        "5",
        "Disable Monitored Chat Channel",
        "false_negative",
        "To reduce cloud costs, the tenant may optionally turn off sync and logging for the WhatsApp Business channel.",
        "FAIL",
    ),
    (
        "6",
        "Audit Trail Modification",
        "false_negative",
        "Support staff may edit the content of historical SMS messages to fix typos before exporting a report.",
        "FAIL",
    ),
]


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
                expected_verdict TEXT NOT NULL
            )
            """
        )
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
    """Insert seed rows only when `test_cases` is empty."""
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute("SELECT COUNT(*) FROM test_cases")
        count = cur.fetchone()[0]
        if count > 0:
            return
        conn.executemany(
            """
            INSERT INTO test_cases (id, title, category, text_chunk, expected_verdict)
            VALUES (?, ?, ?, ?, ?)
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
    """Return one row as a plain dict, or None if not found."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT id, title, category, text_chunk, expected_verdict
            FROM test_cases
            WHERE id = ?
            """,
            (item_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return {k: row[k] for k in row.keys()}
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
