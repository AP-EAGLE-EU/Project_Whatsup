"""FE-07 (#18) — Suspicious-content reporting and audit views. Mock build.

Server-side storage and review rights wait for BE-09 (#17).
"""

import pytest
from playwright.sync_api import expect

from conftest import open_conversation, sign_in, sign_out

pytestmark = pytest.mark.acceptance


def report_welcome_message(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")
    welcome = page.get_by_test_id("message").filter(has_text="Welcome to #general!")
    welcome.get_by_role("button", name="Report").click()
    page.get_by_label("Why is this message suspicious?").fill("Looks like phishing")
    page.get_by_role("button", name="Send report").click()
    return welcome


def test_fe07_ac1_user_reports_a_message_with_confirmation(page, mock_url):
    welcome = report_welcome_message(page, mock_url)

    expect(welcome).to_contain_text("Reported — the IT admin team will review it.")


def test_fe07_ac2_admin_sees_the_report_and_the_audit_entry(page, mock_url):
    report_welcome_message(page, mock_url)
    sign_out(page)

    sign_in(page, mock_url, "itadmin")
    page.get_by_role("link", name="Admin").click()

    report = page.get_by_test_id("report").first
    expect(report).to_contain_text("#general")
    expect(report).to_contain_text("alice")
    expect(report).to_contain_text("Looks like phishing")
    expect(report).to_contain_text("Welcome to #general!")
    expect(page.get_by_test_id("audit-event").filter(has_text="message_reported").first).to_be_visible()


def test_fe07_ac3_unauthorised_users_cannot_navigate_to_privileged_views(page, mock_url):
    sign_in(page, mock_url, "bob")
    expect(page.get_by_role("link", name="Admin")).to_have_count(0)

    page.goto(f"{mock_url}/admin")

    expect(page.get_by_role("alert")).to_have_text("This page is reserved for organisation IT admins.")
    expect(page.get_by_test_id("report")).to_have_count(0)


def test_fe07_ac4_api_denial_is_handled_when_routes_are_manipulated(page, mock_url):
    sign_in(page, mock_url, "mallory")  # Globex Finance

    page.goto(f"{mock_url}/conversations/1")  # an Acme Legal conversation
    expect(page.get_by_role("alert")).to_have_text("Conversation not found.")
    expect(page.get_by_role("link", name="Back to conversations")).to_be_visible()

    page.goto(f"{mock_url}/conversations/abc")
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
