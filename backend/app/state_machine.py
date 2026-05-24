from app.enums import (
    PROJECT_TRANSITIONS,
    RUNNING_STATUSES,
    USER_GATED_STATUSES,
    JobType,
    ProjectStatus,
    SourceMode,
    STATUS_TO_JOB_TYPE,
)
from app.exceptions import PrerequisiteError


class InvalidTransitionError(Exception):
    def __init__(self, current: ProjectStatus, target: ProjectStatus, reason: str = ""):
        self.current = current
        self.target = target
        self.reason = reason
        super().__init__(f"Cannot transition {current.value} -> {target.value}: {reason}")


def can_transition(current: ProjectStatus, target: ProjectStatus) -> bool:
    if target in (ProjectStatus.FAILED, ProjectStatus.CANCELLED):
        return current in RUNNING_STATUSES or current in USER_GATED_STATUSES or current == ProjectStatus.DRAFT
    if current == ProjectStatus.FAILED:
        return False
    if current == ProjectStatus.CANCELLED:
        return False
    allowed = PROJECT_TRANSITIONS.get(current, set())
    return target in allowed


def validate_transition(current: ProjectStatus, target: ProjectStatus) -> None:
    if not can_transition(current, target):
        raise InvalidTransitionError(current, target)


def validate_user_gate_prerequisites(status: ProjectStatus, songs: list) -> None:
    """Ensure user-gated stages have required selections before advancing."""
    if status == ProjectStatus.AWAITING_CANDIDATES:
        if not songs:
            raise PrerequisiteError("Project has no songs")
        missing = [s for s in songs if not s.selected_candidate_id]
        if missing:
            titles = ", ".join(s.song_title for s in missing)
            raise PrerequisiteError(f"Every song must have a selected candidate: {titles}")
    elif status == ProjectStatus.AWAITING_CLIP_TRIM:
        if not songs:
            raise PrerequisiteError("Project has no songs")
        for song in songs:
            effective = song.clip_time if song.clip_time is not None else None
            if effective is not None and effective < 1.0:
                raise PrerequisiteError(f"Invalid clip duration for {song.song_title}")
    elif status == ProjectStatus.AWAITING_RENDER_ORDER:
        if not songs:
            raise PrerequisiteError("Project has no songs")
        orders = [s.render_order for s in songs]
        if len(orders) != len(set(orders)):
            raise PrerequisiteError("Render order must be unique for every song")


def is_editable(status: ProjectStatus) -> bool:
    return status in (ProjectStatus.DRAFT, ProjectStatus.SONG_SELECTION)


def is_deletable(status: ProjectStatus) -> bool:
    return status in (
        ProjectStatus.DRAFT,
        ProjectStatus.SONG_SELECTION,
        ProjectStatus.COMPLETED,
        ProjectStatus.FAILED,
        ProjectStatus.CANCELLED,
    )


def job_type_for_status(status: ProjectStatus) -> JobType | None:
    return STATUS_TO_JOB_TYPE.get(status)


def next_status_after_song_selection(source_mode: SourceMode) -> ProjectStatus:
    if source_mode == SourceMode.MANUAL:
        return ProjectStatus.AWAITING_CANDIDATES
    return ProjectStatus.SOURCING


def next_auto_status_after_user_gate(status: ProjectStatus) -> ProjectStatus | None:
    if status == ProjectStatus.AWAITING_CANDIDATES:
        return ProjectStatus.AWAITING_CLIP_TRIM
    if status == ProjectStatus.AWAITING_CLIP_TRIM:
        return ProjectStatus.DOWNLOADING
    if status == ProjectStatus.AWAITING_RENDER_ORDER:
        return ProjectStatus.RENDERING
    return None
