from logging.config import fileConfig
from pathlib import Path
import os

from alembic import context
from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv

from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.models.employer_profile import EmployerProfile
from app.models.category import Category
from app.models.task import Task
from app.models.application import Application
from app.models.assignment import Assignment
from app.models.work_evidence import WorkEvidence
from app.models.payment import Payment
from app.models.rating import Rating
from app.models.dispute import Dispute
from app.models.report import Report
from app.models.notification import Notification
from app.models.activity_log import ActivityLog

# Alembic Config object
config = context.config


# Logging configuration
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Load .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)


# Ambil DATABASE_URL dari .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL belum diatur di file .env")


# Karena kita menggunakan psycopg 3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )


# Berikan URL database ke Alembic
config.set_main_option("sqlalchemy.url", DATABASE_URL)


# Import SQLModel metadata
from sqlmodel import SQLModel

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()