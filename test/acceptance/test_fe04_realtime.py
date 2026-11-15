"""FE-04 (#12) — Real-time chat and message state. Mock build.

Two tabs of one browser share the mock data and each holds its own session, so two users
chat "live" through the mock event bus. The mock delivers every event TWICE on purpose
(at-least-once delivery) to exercise de-duplication. The real WebSocket path is verified
on the live stack once BE-06 (#11) exists.
"""

import pytest
from playwright.sync_api import Page, expect

from conftest import open_conversation, send_message, sign_in

pytestmark = pytest.mark.acceptance


def two_users_in_general(page: Page, mock_url: str) -> tuple[Page, Page]:
    alice = page
    bob = page.context.new_page()
    bob.set_default_timeout(10_000)
    sign_in(alice, mock_url, "alice")
    sign_in(bob, mock_url, "bob")
    open_conversation(alice, "#general")
    open_conversation(bob, "#general")
    expect(alice.get_by_test_id("live-status")).to_have_text("Live")
    expect(bob.get_by_test_id("live-status")).to_have_text("Live")
    return alice, bob


def test_fe04_ac1_two_users_exchange_messages_without_refresh(page, mock_url):
    alice, bob = two_users_in_general(page, mock_url)

    send_message(alice, "Ping from Alice")
    expect(bob.get_by_test_id("message-body").filter(has_text="Ping from Alice")).to_be_visible()

    send_message(bob, "Pong from Bob")
    expect(alice.get_by_test_id("message-body").filter(has_text="Pong from Bob")).to_be_visible()


def test_fe04_ac2_history_is_correct_after_reload(page, mock_url):
    alice, bob = two_users_in_general(page, mock_url)
    send_message(alice, "First")
    expect(bob.get_by_test_id("message-body").filter(has_text="First")).to_be_visible()
    send_message(bob, "Second")
    expect(alice.get_by_test_id("message-body").filter(has_text="Second")).to_be_visible()

    alice.reload()

    expect(alice.get_by_test_id("message-body")).to_have_text(
        ["Welcome to #general!", "Hi Bob, thanks.", "First", "Second"]
    )


def test_fe04_ac3_reconnect_restores_the_visible_conversation(page, mock_url):
    alice, bob = two_users_in_general(page, mock_url)

    alice.goto(alice.url.replace("/conversations/1", "/status"))  # alice's live connection drops
    send_message(bob, "Sent while Alice was away")
    expect(bob.get_by_test_id("message-body").filter(has_text="Sent while Alice was away")).to_be_visible()
    alice.go_back()  # reconnect + catch-up over REST

    expect(alice.get_by_test_id("live-status")).to_have_text("Live")
    expect(alice.get_by_test_id("message-body").last).to_have_text("Sent while Alice was away")


def test_fe04_ac4_duplicate_events_are_shown_once(page, mock_url):
    alice, bob = two_users_in_general(page, mock_url)

    send_message(alice, "Exactly once please")
    expect(bob.get_by_test_id("message-body").filter(has_text="Exactly once please")).to_be_visible()
    alice.wait_for_timeout(1500)  # let duplicate deliveries and catch-up fetches arrive

    expect(alice.get_by_test_id("message-body").filter(has_text="Exactly once please")).to_have_count(1)
    expect(bob.get_by_test_id("message-body").filter(has_text="Exactly once please")).to_have_count(1)
