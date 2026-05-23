import pytest

from app.enums import ProjectStatus
from app.state_machine import InvalidTransitionError, can_transition, validate_transition


def test_valid_draft_to_loading():
    assert can_transition(ProjectStatus.DRAFT, ProjectStatus.LOADING_THEMES)


def test_completed_can_rerender():
    assert can_transition(ProjectStatus.COMPLETED, ProjectStatus.RENDERING)


def test_invalid_draft_to_downloading():
    assert not can_transition(ProjectStatus.DRAFT, ProjectStatus.DOWNLOADING)


def test_any_running_can_fail():
    assert can_transition(ProjectStatus.DOWNLOADING, ProjectStatus.FAILED)


def test_validate_raises():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ProjectStatus.DRAFT, ProjectStatus.COMPLETED)
