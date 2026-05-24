import enum


class ProjectStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    LOADING_THEMES = "LOADING_THEMES"
    SONG_SELECTION = "SONG_SELECTION"
    SOURCING = "SOURCING"
    AWAITING_CANDIDATES = "AWAITING_CANDIDATES"
    DOWNLOADING = "DOWNLOADING"
    PROBING_NORMALIZING = "PROBING_NORMALIZING"
    CUTTING = "CUTTING"
    OVERLAYING = "OVERLAYING"
    AWAITING_RENDER_ORDER = "AWAITING_RENDER_ORDER"
    RENDERING = "RENDERING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SongType(str, enum.Enum):
    OPENING = "opening"
    ENDING = "ending"


class Encoder(str, enum.Enum):
    AUTO = "auto"
    LIBX264 = "libx264"
    H264_NVENC = "h264_nvenc"
    HEVC_NVENC = "hevc_nvenc"


class SongStatus(str, enum.Enum):
    PENDING = "pending"
    SOURCING = "sourcing"
    AWAITING_SELECTION = "awaiting_selection"
    SELECTED = "selected"
    DOWNLOADING = "downloading"
    NORMALIZING = "normalizing"
    CUTTING = "cutting"
    OVERLAYING = "overlaying"
    READY = "ready"
    FAILED = "failed"


class JobType(str, enum.Enum):
    LOAD_THEMES = "load_themes"
    SOURCE_CANDIDATES = "source_candidates"
    DOWNLOAD = "download"
    PROBE_NORMALIZE = "probe_normalize"
    CUT = "cut"
    OVERLAY = "overlay"
    RENDER = "render"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LogLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class SourceMode(str, enum.Enum):
    AUTO = "auto"
    MANUAL = "manual"


# Valid project status transitions (excluding FAILED/CANCELLED from any running)
PROJECT_TRANSITIONS: dict[ProjectStatus, set[ProjectStatus]] = {
    ProjectStatus.DRAFT: {ProjectStatus.LOADING_THEMES},
    ProjectStatus.LOADING_THEMES: {ProjectStatus.SONG_SELECTION, ProjectStatus.FAILED},
    ProjectStatus.SONG_SELECTION: {ProjectStatus.SOURCING, ProjectStatus.FAILED},
    ProjectStatus.SOURCING: {ProjectStatus.AWAITING_CANDIDATES, ProjectStatus.FAILED},
    ProjectStatus.AWAITING_CANDIDATES: {ProjectStatus.DOWNLOADING, ProjectStatus.FAILED},
    ProjectStatus.DOWNLOADING: {ProjectStatus.PROBING_NORMALIZING, ProjectStatus.FAILED},
    ProjectStatus.PROBING_NORMALIZING: {ProjectStatus.CUTTING, ProjectStatus.FAILED},
    ProjectStatus.CUTTING: {ProjectStatus.OVERLAYING, ProjectStatus.FAILED},
    ProjectStatus.OVERLAYING: {ProjectStatus.AWAITING_RENDER_ORDER, ProjectStatus.FAILED},
    ProjectStatus.AWAITING_RENDER_ORDER: {ProjectStatus.RENDERING, ProjectStatus.FAILED},
    ProjectStatus.RENDERING: {ProjectStatus.COMPLETED, ProjectStatus.FAILED},
    ProjectStatus.COMPLETED: {ProjectStatus.RENDERING},
    ProjectStatus.FAILED: set(),  # retry handled separately
    ProjectStatus.CANCELLED: set(),
}

RUNNING_STATUSES = {
    ProjectStatus.LOADING_THEMES,
    ProjectStatus.SOURCING,
    ProjectStatus.DOWNLOADING,
    ProjectStatus.PROBING_NORMALIZING,
    ProjectStatus.CUTTING,
    ProjectStatus.OVERLAYING,
    ProjectStatus.RENDERING,
}

USER_GATED_STATUSES = {
    ProjectStatus.SONG_SELECTION,
    ProjectStatus.AWAITING_CANDIDATES,
    ProjectStatus.AWAITING_RENDER_ORDER,
}

STATUS_TO_JOB_TYPE: dict[ProjectStatus, JobType] = {
    ProjectStatus.LOADING_THEMES: JobType.LOAD_THEMES,
    ProjectStatus.SOURCING: JobType.SOURCE_CANDIDATES,
    ProjectStatus.DOWNLOADING: JobType.DOWNLOAD,
    ProjectStatus.PROBING_NORMALIZING: JobType.PROBE_NORMALIZE,
    ProjectStatus.CUTTING: JobType.CUT,
    ProjectStatus.OVERLAYING: JobType.OVERLAY,
    ProjectStatus.RENDERING: JobType.RENDER,
}
