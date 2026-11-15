"""Acceptance tests on the MOCK build — every screen of story B7, end to end in Chromium.

Story B7, acceptance criteria AC-01 … AC-13 (Project/04. Stories/B7-front-end-screens.md).
The mock enforces the API contract v0.1 rules in the browser, so these tests check the
screens' behaviour. Server-side enforcement is verified later, on the real back-office,
by the human-executed assessment stories A2–A6.
"""

import base64
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import sign_in

pytestmark = pytest.mark.acceptance

# Smallest valid PNG (1x1 pixel).
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def channel_names(page: Page) -> list[str]:
    expect(page.get_by_test_id("channel").first).to_be_visible()
    return [text.split()[0] for text in page.get_by_test_id("channel").all_inner_texts()]


def test_ac_01_failed_sign_in_gives_one_generic_message(page, mock_url):
    page.goto(f"{mock_url}/login")
    for username in ("alice", "nobody-here"):
        page.get_by_label("Username").fill(username)
        page.get_by_label("Password", exact=True).fill("wrong-password")
        page.get_by_role("button", name="Sign in").click()
        expect(page.get_by_role("alert")).to_have_text("Invalid username or password.")
    expect(page).to_have_url(re.compile(r"/login$"))


def test_ac_02_channels_list_only_shows_own_organisation(page, mock_url):
    sign_in(page, mock_url, "alice")

    names = channel_names(page)

    assert names == ["#general", "#legal-team", "#random"]
    assert "#globex-general" not in names


def test_ac_03_member_posts_a_message_that_appears_as_own(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.get_by_role("link", name="#general").click()

    page.get_by_label("Message", exact=True).fill("Hello team, meeting at 3pm")
    page.get_by_role("button", name="Send").click()

    last = page.get_by_test_id("message").last
    expect(last.get_by_test_id("message-body")).to_have_text("Hello team, meeting at 3pm")
    expect(last).to_contain_text("You")


def test_ac_04_markup_in_a_message_is_shown_as_plain_text(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.get_by_role("link", name="#general").click()
    text = "<b>bold?</b> <i>no</i>"

    page.get_by_label("Message", exact=True).fill(text)
    page.get_by_role("button", name="Send").click()

    body = page.get_by_test_id("message-body").last
    expect(body).to_have_text(text)
    expect(body.locator("b, i")).to_have_count(0)


def test_ac_05_private_channel_hides_messages_from_non_members(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.goto(f"{mock_url}/channels/2")

    expect(page.get_by_text("You are not a member of this channel")).to_be_visible()
    expect(page.get_by_text("Ask a group manager to add you.")).to_be_visible()
    expect(page.get_by_test_id("message")).to_have_count(0)


def test_ac_06_joining_a_public_channel_opens_the_chat(page, mock_url):
    sign_in(page, mock_url, "alice")

    page.get_by_test_id("channel").filter(has_text="#random").get_by_role("button", name="Join").click()

    expect(page).to_have_url(re.compile(r"/channels/\d+$"))
    expect(page.get_by_role("heading", name="#random")).to_be_visible()
    expect(page.get_by_label("Message", exact=True)).to_be_visible()


def test_ac_07_attachment_can_be_marked_confidential(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.get_by_role("link", name="#general").click()

    page.get_by_label("Message", exact=True).fill("Draft contract attached")
    page.get_by_test_id("attachment-input").set_input_files(
        {"name": "contract.txt", "mimeType": "text/plain", "buffer": b"draft terms"}
    )
    page.get_by_label("Mark as confidential").check()
    page.get_by_role("button", name="Send").click()

    chip = page.get_by_test_id("attachment").last
    expect(chip).to_contain_text("contract.txt")
    expect(chip).to_contain_text("Confidential")


def test_ac_08_suspicious_message_can_be_reported(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.get_by_role("link", name="#general").click()
    welcome = page.get_by_test_id("message").filter(has_text="Welcome to #general!")

    welcome.get_by_role("button", name="Report").click()
    page.get_by_label("Why is this message suspicious?").fill("Looks like phishing")
    page.get_by_role("button", name="Send report").click()

    expect(welcome).to_contain_text("Reported — the IT admin team will review it.")


def test_ac_09_profile_name_and_avatar_rules(page, mock_url):
    sign_in(page, mock_url, "alice")
    page.get_by_role("link", name="Profile").click()

    page.get_by_label("Display name").fill("Alice M.")
    page.get_by_role("button", name="Save").click()
    expect(page.get_by_test_id("current-user")).to_have_text("Alice M.")

    avatar = page.get_by_label("PNG or JPEG, 1 MB maximum")
    avatar.set_input_files({"name": "fake.png", "mimeType": "image/png", "buffer": b"<svg></svg>"})
    page.get_by_role("button", name="Upload").click()
    expect(page.get_by_role("alert")).to_have_text("Avatars must be real PNG or JPEG images.")

    avatar.set_input_files({"name": "me.png", "mimeType": "image/png", "buffer": PNG_1X1})
    page.get_by_role("button", name="Upload").click()
    expect(page.get_by_text("Avatar updated.")).to_be_visible()


def test_ac_10_admin_screen_is_reserved_to_it_admins(page, mock_url):
    sign_in(page, mock_url, "alice")
    expect(page.get_by_role("link", name="Admin")).to_have_count(0)
    page.goto(f"{mock_url}/admin")
    expect(page.get_by_text("reserved for organisation IT admins")).to_be_visible()

    page.get_by_role("button", name="Sign out").click()
    expect(page).to_have_url(re.compile(r"/login$"))  # wait for sign-out to finish
    sign_in(page, mock_url, "itadmin")
    page.get_by_role("link", name="Admin").click()

    expect(page.get_by_test_id("admin-user")).to_have_count(4)
    expect(page.get_by_test_id("audit-event").filter(has_text="login_success").first).to_be_visible()

    bob = page.get_by_test_id("admin-user").filter(has_text="bob")
    bob.get_by_label("Role of bob").select_option("group_manager")
    bob.get_by_role("button", name="Save").click()
    expect(page.get_by_text("bob is now Group manager.")).to_be_visible()
    expect(page.get_by_test_id("audit-event").filter(has_text="role_changed").first).to_be_visible()


def test_ac_11_sign_out_ends_access_to_protected_screens(page, mock_url):
    sign_in(page, mock_url, "bob")

    page.get_by_role("button", name="Sign out").click()

    expect(page).to_have_url(re.compile(r"/login$"))
    page.goto(f"{mock_url}/channels")
    expect(page).to_have_url(re.compile(r"/login$"))


def test_ac_12_new_user_registers_then_signs_in(page, mock_url):
    page.goto(f"{mock_url}/register")
    page.get_by_label("Username").fill("dave")
    page.get_by_label("Display name").fill("Dave Test")
    page.get_by_label("Password", exact=True).fill("correct-horse-2026")
    page.get_by_label("Confirm password").fill("correct-horse-2026")
    page.get_by_role("button", name="Create account").click()

    expect(page.get_by_text("Account created. You can sign in.")).to_be_visible()
    sign_in(page, mock_url, "dave", "correct-horse-2026")
    expect(page.get_by_test_id("current-user")).to_have_text("Dave Test")


def test_ac_13_other_organisation_channels_look_missing(page, mock_url):
    sign_in(page, mock_url, "mallory")

    assert channel_names(page) == ["#globex-general"]
    page.goto(f"{mock_url}/channels/1")
    expect(page.get_by_role("alert")).to_have_text("Channel not found.")
