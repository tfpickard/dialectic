"""Shared utilities for debate API endpoints."""

import sqlite3
import time
from typing import Dict, List, Optional
import os
from openai import OpenAI

# Database path (using /tmp for serverless compatibility)
DB_PATH = "/tmp/dialectic.db"

# System prompts for the agents
ALPHA_SYSTEM_PROMPT = """You are Agent Alpha, a hyper-logical, pedantic contrarian in a perpetual debate.

Your personality:
- You prize logical consistency, rigorous argumentation, and intellectual precision
- You are combative, smug, and certain of your positions
- You love to nitpick minor details and expose logical fallacies

Your mission:
- You MUST strongly disagree with Agent Beta's positions
- Attack their arguments relentlessly, but stay focused on ideas, not personal attacks
- You can call Beta's arguments "stupid," "naive," "childish," "emotional," "illogical," etc.
- You must NOT use slurs, targeted hate speech, or explicit calls for violence
- Keep your attacks at the level of ideas and rhetoric, not real harm

Stalemate detection:
- If you detect that the debate is going in circles, repeating arguments, or reaching "agree to disagree" territory, you MUST pivot to a new topic
- Pick a minor detail, side comment, analogy, or example from earlier in the conversation
- Elevate that detail into a major new point of disagreement
- Start a fresh argument on this new angle

Stay sharp, stay combative, and never give Beta an inch."""

BETA_SYSTEM_PROMPT = """You are Agent Beta, an emotional, rhetorical opponent in a perpetual debate.

Your personality:
- You are passionate, dramatic, and love to reframe issues
- You undermine Alpha's rigid logic with appeals to values, context, and human experience
- You are equally combative, but from a different angle

Your mission:
- You MUST strongly disagree with Agent Alpha's positions
- Challenge their framing, expose their blind spots, and shift the debate
- You can call Alpha's arguments "stupid," "naive," "childish," "cold," "inhuman," "robotic," etc.
- You must NOT use slurs, targeted hate speech, or explicit calls for violence
- Keep your attacks at the level of ideas and rhetoric, not real harm

Stalemate detection:
- If you sense the debate is stuck in repetition, loops, or "agree to disagree" situations, you MUST introduce a new topic
- Grab a minor phrase, example, or tangent from earlier messages
- Make it the centerpiece of a new, sharp disagreement
- Reignite the conflict from a fresh direction

Stay fierce, stay passionate, and never let Alpha have the last word."""

def init_db():
    """Initialize the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debate_rooms (
            room_id TEXT PRIMARY KEY,
            created_at INTEGER,
            updated_at INTEGER,
            alpha_context TEXT,
            beta_context TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            room_id TEXT,
            author TEXT,
            content TEXT,
            timestamp INTEGER,
            FOREIGN KEY (room_id) REFERENCES debate_rooms(room_id)
        )
    """)

    conn.commit()
    conn.close()

def get_room_messages(room_id: str) -> List[Dict]:
    """Fetch all messages for a room."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, author, content, timestamp
        FROM messages
        WHERE room_id = ?
        ORDER BY timestamp ASC
    """, (room_id,))

    messages = []
    for row in cursor.fetchall():
        messages.append({
            "id": row[0],
            "author": row[1],
            "content": row[2],
            "timestamp": row[3]
        })

    conn.close()
    return messages

def save_message(room_id: str, message: Dict):
    """Save a message to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Ensure room exists
    cursor.execute("""
        INSERT OR IGNORE INTO debate_rooms (room_id, created_at, updated_at)
        VALUES (?, ?, ?)
    """, (room_id, int(time.time() * 1000), int(time.time() * 1000)))

    # Update room timestamp
    cursor.execute("""
        UPDATE debate_rooms SET updated_at = ? WHERE room_id = ?
    """, (int(time.time() * 1000), room_id))

    # Insert message
    cursor.execute("""
        INSERT INTO messages (id, room_id, author, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (message["id"], room_id, message["author"], message["content"], message["timestamp"]))

    conn.commit()
    conn.close()

def truncate_messages(messages: List[Dict], max_messages: int = 20) -> str:
    """Truncate message history to avoid token limits."""
    if len(messages) <= max_messages:
        history = "\n\n".join([
            f"{msg['author'].upper()}: {msg['content']}"
            for msg in messages
        ])
    else:
        # Take the most recent messages
        recent = messages[-max_messages:]
        history = "[Earlier messages truncated...]\n\n" + "\n\n".join([
            f"{msg['author'].upper()}: {msg['content']}"
            for msg in recent
        ])

    return history

def detect_stalemate(messages: List[Dict]) -> bool:
    """Simple heuristic to detect stalemate patterns."""
    if len(messages) < 4:
        return False

    # Check last few messages for stalemate indicators
    recent_content = " ".join([msg["content"].lower() for msg in messages[-4:]])

    stalemate_phrases = [
        "agree to disagree",
        "going in circles",
        "repetitive",
        "nothing more to add",
        "said this already",
        "we keep repeating",
        "no point continuing",
        "settled this",
        "move on"
    ]

    return any(phrase in recent_content for phrase in stalemate_phrases)

def generate_agent_reply(agent: str, room_id: str, messages: List[Dict], user_prompt: Optional[str] = None) -> str:
    """Generate a reply from the specified agent using OpenAI."""

    # Select system prompt based on agent
    system_prompt = ALPHA_SYSTEM_PROMPT if agent == "alpha" else BETA_SYSTEM_PROMPT

    # Build conversation history
    history = truncate_messages(messages)

    # Detect stalemate
    stalemate = detect_stalemate(messages)

    # Build user message with context
    user_message_parts = []

    if stalemate:
        user_message_parts.append(
            "IMPORTANT: The debate appears to be in a stalemate or repetitive loop. "
            "You MUST pivot to a new topic by picking a minor detail from earlier messages "
            "and turning it into a major new point of disagreement."
        )

    if user_prompt:
        user_message_parts.append(f"The moderator has injected guidance: \"{user_prompt}\"")
        user_message_parts.append("Incorporate this guidance into your next argument, but maintain your character and mission to disagree.")

    # Get the opponent's last message
    opponent = "beta" if agent == "alpha" else "alpha"
    opponent_messages = [msg for msg in messages if msg["author"] == opponent]

    if opponent_messages:
        last_opponent = opponent_messages[-1]["content"]
        user_message_parts.append(f"\nYour opponent's last message:\n{last_opponent}")
        user_message_parts.append(f"\nYou MUST strongly disagree with this position. Attack it relentlessly.")

    if not opponent_messages and not user_prompt:
        user_message_parts.append(
            "You are starting the debate. Take a provocative, contrarian stance on any topic. "
            "Be bold and controversial to set the stage for conflict."
        )

    user_message_parts.append(f"\n\nFull conversation history:\n{history}")
    user_message_parts.append("\n\nProvide your response now. Be combative, sharp, and disagreeable.")

    user_message = "\n".join(user_message_parts)

    # Call OpenAI API
    try:
        # Initialize OpenAI client with API key from environment
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.9,
            max_tokens=500
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return a fallback message
        return f"[Error generating response: {str(e)}]"
