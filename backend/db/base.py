from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so that Base.metadata is populated
# when drop_all / create_all is called.
from models import deployment, log, user  # noqa: F401, E402
