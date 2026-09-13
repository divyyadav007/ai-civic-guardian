"""
db/seed.py — Seed default departments and routing rules.
Run once after first migration: python -m app.db.seed

Per PHASES.md Phase 1: "Define department routing table seed data."
Per ARCHITECTURE §6: routing table in DB, editable by admin, not hardcoded.
"""
import asyncio
import sys
import os

# Make app importable when run as a script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.department import Department
from app.models.user import User
from app.core.security import get_password_hash
from app.services.routing_engine import get_default_routing_rules


async def seed_departments(session):
    """Insert default departments if they don't exist."""
    rules = get_default_routing_rules()
    created = 0
    for rule in rules:
        existing = await session.execute(
            select(Department).where(Department.name == rule["name"])
        )
        if not existing.scalar_one_or_none():
            dept = Department(name=rule["name"], routing_keys=rule["routing_keys"])
            session.add(dept)
            created += 1
    print(f"  Departments: {created} created, {len(rules) - created} already existed.")
    return created


async def seed_users(session):
    """Seed admin, department officers, and a demo citizen."""
    # 1. Admin
    admin_res = await session.execute(select(User).where(User.email == "admin@civic.gov.in"))
    if not admin_res.scalar_one_or_none():
        session.add(User(
            name="System Admin",
            email="admin@civic.gov.in",
            phone=None,
            hashed_password=get_password_hash("Admin@123"),
            role="admin",
        ))
        print("  Admin user created: admin@civic.gov.in / Admin@123")

    # 2. Roads Officer
    roads_dept = (await session.execute(select(Department).where(Department.name.like("%Road%")))).scalar_one_or_none()
    roads_officer = (await session.execute(select(User).where(User.email == "officer.roads@civic.gov.in"))).scalar_one_or_none()
    if not roads_officer and roads_dept:
        session.add(User(
            name="Officer Rajesh Kumar",
            email="officer.roads@civic.gov.in",
            phone=None,
            hashed_password=get_password_hash("Officer@123"),
            role="officer",
            department_id=roads_dept.id,
        ))
        print("  Roads Officer created: officer.roads@civic.gov.in / Officer@123")

    # 3. Sanitation Officer
    san_dept = (await session.execute(select(Department).where(Department.name.like("%Sanitation%")))).scalar_one_or_none()
    san_officer = (await session.execute(select(User).where(User.email == "officer.sanitation@civic.gov.in"))).scalar_one_or_none()
    if not san_officer and san_dept:
        session.add(User(
            name="Officer Priya Singh",
            email="officer.sanitation@civic.gov.in",
            phone=None,
            hashed_password=get_password_hash("Officer@123"),
            role="officer",
            department_id=san_dept.id,
        ))
        print("  Sanitation Officer created: officer.sanitation@civic.gov.in / Officer@123")

    # 4. Demo Citizen
    citizen = (await session.execute(select(User).where(User.email == "citizen@civic.gov.in"))).scalar_one_or_none()
    if not citizen:
        session.add(User(
            name="Divyanshu Yadav",
            email="citizen@civic.gov.in",
            phone="9876543210",
            hashed_password=get_password_hash("Citizen@123"),
            role="citizen",
        ))
        print("  Citizen created: citizen@civic.gov.in / Citizen@123")


async def main():
    print("Seeding database...")
    async with AsyncSessionLocal() as session:
        await seed_departments(session)
        await seed_users(session)
        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
