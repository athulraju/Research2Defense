import sqlite3
import json
from pathlib import Path
from config import DB_PATH


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            title TEXT,
            source TEXT DEFAULT 'local',
            status TEXT DEFAULT 'pending',
            arxiv_id TEXT,
            arxiv_url TEXT,
            summary TEXT,
            analysis TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS detections (
            id TEXT PRIMARY KEY,
            paper_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            rationale TEXT,
            severity TEXT,
            confidence TEXT,
            detection_type TEXT,
            required_telemetry TEXT,
            implementation_notes TEXT,
            false_positives TEXT,
            tuning_advice TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paper_id) REFERENCES papers(id)
        );

        CREATE TABLE IF NOT EXISTS skill_files (
            id TEXT PRIMARY KEY,
            paper_id TEXT NOT NULL,
            detection_id TEXT,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paper_id) REFERENCES papers(id)
        );

        CREATE TABLE IF NOT EXISTS schemas (
            id TEXT PRIMARY KEY,
            paper_id TEXT,
            filename TEXT,
            content TEXT,
            parsed TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            paper_id TEXT,
            job_type TEXT,
            status TEXT DEFAULT 'pending',
            progress INTEGER DEFAULT 0,
            message TEXT,
            result TEXT,
            error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
