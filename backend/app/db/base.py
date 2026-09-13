from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models here so Alembic env.py discovers them via Base.metadata
# (models __init__ handles the actual imports)
import app.models  # noqa: F401, E402
