class CancelledJob(Exception):
    """Raised when a job is cancelled during execution."""

    pass


class PrerequisiteError(Exception):
    """Raised when a stage transition lacks required prerequisites."""

    pass
