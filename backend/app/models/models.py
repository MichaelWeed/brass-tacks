from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Date, Integer, REAL, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB, INT4RANGE
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import uuid

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_provider_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def full_name(self) -> str:
        return self.display_name

    @full_name.setter
    def full_name(self, value: str):
        self.display_name = value

class MasterProfile(Base):
    __tablename__ = "master_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    parsed_markdown = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    experiences = relationship("Experience", back_populates="profile")

class Experience(Base):
    __tablename__ = "experiences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("master_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    organization = Column(String)
    description = Column(Text, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    category = Column(String, nullable=False, default="core") # core, stretch, irrelevant
    is_visible = Column(Boolean, default=True)
    metrics_json = Column(JSONB)
    tags = Column(JSONB) # List of skills
    qdrant_point_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    profile = relationship("MasterProfile", back_populates="experiences")

class ProfileEntity(Base):
    __tablename__ = "profile_entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("master_profiles.id", ondelete="CASCADE"), nullable=False)
    experience_id = Column(UUID(as_uuid=True), ForeignKey("experiences.id", ondelete="CASCADE"))
    entity_type = Column(String, nullable=False) # METRIC, DATE, ORG, SKILL, PERSON
    entity_value = Column(String, nullable=False)
    normalized_value = Column(String)
    source_span = Column(INT4RANGE)
    confidence = Column(REAL, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    company = Column(String)
    raw_text = Column(Text, nullable=False)
    parsed_markdown = Column(Text)
    enriched_json = Column(JSONB)
    qdrant_point_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def company_name(self):
        return self.company

    @company_name.setter
    def company_name(self, value):
        self.company = value

    @property
    def role_title(self):
        return self.title

    @role_title.setter
    def role_title(self, value):
        self.title = value


class GenerationRun(Base):
    __tablename__ = "generation_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("master_profiles.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    output_type = Column(String, nullable=False) # resume, cover_letter
    status = Column(String, nullable=False, default="queued")
    weirdness_level = Column(String, nullable=False, default="medium")
    draft_output = Column(Text)
    critique_json = Column(JSONB)
    final_output = Column(Text)
    noise_seed = Column(Integer)
    model_costs = Column(JSONB)
    error_message = Column(Text)
    fidelity_score = Column(REAL)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class GenerationOverride(Base):
    __tablename__ = "generation_overrides"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("generation_runs.id", ondelete="CASCADE"), nullable=False)
    experience_id = Column(UUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    force_include = Column(Boolean, default=False)
    force_exclude = Column(Boolean, default=False)
