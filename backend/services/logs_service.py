from sqlalchemy import func
from sqlalchemy.orm import Session

from models.log import Log


class LogsService:
    @staticmethod
    def list_logs(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        level: str | None = None,
        query: str | None = None,
    ) -> tuple[list[Log], int]:
        stmt = db.query(Log)

        if level:
            stmt = stmt.filter(Log.level == level)
        if query:
            stmt = stmt.filter(Log.message.ilike(f"%{query}%"))

        total = stmt.with_entities(func.count(Log.id)).scalar() or 0
        items = (
            stmt.order_by(Log.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total
