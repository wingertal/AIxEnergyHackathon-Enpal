"""Conversation persistence helper (merged in from the standalone chatbot).

Thin CRUD over the Conversation / Message tables. Used by the chat service to
store and replay per-household conversation history.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.chat import Conversation, Message


class ConversationStore:
    def create(self, db: Session, household_id: str, title: str = "") -> Conversation:
        conv = Conversation(household_id=household_id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv

    def get(self, db: Session, conversation_id: int) -> Conversation | None:
        return db.get(Conversation, conversation_id)

    def add_message(
        self, db: Session, conversation_id: int, role: str, content: str
    ) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content)
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

    def get_messages(self, db: Session, conversation_id: int) -> list[Message]:
        return (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.id.asc())
            .all()
        )

    def list_conversations(self, db: Session, household_id: str | None = None) -> list[Conversation]:
        q = db.query(Conversation)
        if household_id:
            q = q.filter(Conversation.household_id == household_id)
        return q.order_by(Conversation.created_at.desc()).all()


conversation_store = ConversationStore()
