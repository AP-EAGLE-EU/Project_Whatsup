"""FE-02 (#7) — Build login screen and authenticated route handling. Mock build.

AC5 ("authentication is verified against the real backend") lives in
test_acceptance_live.py and waits for BE-03 (#6).
"""

import re

import pytest
from playwright.sync_api import expect

from conftest import MOCK_SESSION_KEY, open_conversation, send_message, sign_in, sign_out

pytestmark = pytest.mark.acceptance


def test_fe02_ac1_login_form_validates_input_and_shows_api_errors(page, mock_url):
    page.goto(f"{mock_url}/login")
    expect(page.get_by_label("Username")).to_have_attribute("required", "")
    expect(page.get_by_label("Password", exact=True)).to_have_attribute("required", "")

    # Same generic message for a wrong password and an unknown user (SR-AUTH-03).
    for username in ("alice", "nobody-here"):
        page.get_by_label("Username").fill(username)
        page.get_by_label("Password", exact=True).fill("wrong-password")
        page.get_by_role("button", name="Sign in").click()
        expect(page.get_by_role("alert")).to_have_text("Invalid username or password.")
    expect(page).to_have_url(re.compile(r"/login$"))


def test_fe02_ac2_successful_login_enters_the_chat_interface(page, mock_url):
    sign_in(page, mock_url, "alice")

    expect(page.get_by_role("heading", name="Conversations", exact=True)).to_be_visible()
    expect(page.get_by_test_id("current-user")).to_have_text("Alice Martin")


def test_fe02_ac3_logout_returns_to_login_and_protects_screens(page, mock_url):
    sign_in(page, mock_url, "bob")

    sign_out(page)

    for path in ("/conversations", "/conversations/1", "/profile", "/admin"):
        page.goto(f"{mock_url}{path}")
        expect(page).to_have_url(re.compile(r"/login$"))


def test_fe02_ac4_session_expiry_is_handled_without_broken_screens(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")

    # The server forgets the session (expiry / server-side logout).
    page.evaluate(f"sessionStorage.removeItem('{MOCK_SESSION_KEY}')")
    send_message(page, "Are you still there?")

    expect(page).to_have_url(re.compile(r"/login\?expired=1$"))
    expect(page.get_by_text("Your session has ended. Please sign in again.")).to_be_visible()
    expect(page.get_by_role("button", name="Sign in")).to_be_enabled()
