from app.enums import ProjectStatus, SourceMode
from app.state_machine import can_transition, next_status_after_song_selection


def test_song_selection_can_skip_sourcing_in_manual_mode():
    assert can_transition(ProjectStatus.SONG_SELECTION, ProjectStatus.AWAITING_CANDIDATES)
    assert next_status_after_song_selection(SourceMode.MANUAL) == ProjectStatus.AWAITING_CANDIDATES
    assert next_status_after_song_selection(SourceMode.AUTO) == ProjectStatus.SOURCING
