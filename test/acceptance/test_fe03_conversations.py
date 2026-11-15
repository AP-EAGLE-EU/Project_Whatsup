"""FE-03 (#10) — Conversation list and messaging interface. Mock build.

"Compose/send works with the actual backend" waits for BE-05 (#9).
"""

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import open_conversation, send_message, sign_in

pytestmark = pytest.mark.acceptance


def conversation_titles(page: Page) -> list[str]:
    rows = page.get_by_test_id("conversation")
    expect(rows.first).to_be_visible()
    return [rows.nth(index).get_by_role("link").inner_text() for index in range(rows.count())]


def test_fe03_ac1_conversation_list_loads_for_the_authenticated_user(page, mock_url):
    sign_in(page, mock_url, "alice")

    assert conversation_titles(page) == ["#general", "Bob Singh"]
    expect(page.get_by_test_id("conversation").filter(has_text="Bob Singh")).to_contain_text("Direct")


def test_fe03_ac1_list_never_shows_another_organisation(page, mock_url):
    sign_in(page, mock_url, "mallory")

    assert conversation_titles(page) == ["#globex-general"]


def test_fe03_ac2_opening_a_conversation_shows_its_history_in_order(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")

    bodies = page.get_by_test_id("message-body")
    expect(bodies).to_have_text(["Welcome to #general!", "Hi Bob, thanks."])


def test_fe03_ac3_compose_and_send(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")

    send_message(page, "Hello team, meeting at 3pm")

    last = page.get_by_test_id("message").last
    expect(last.get_by_test_id("message-body")).to_have_text("Hello team, meeting at 3pm")
    expect(last).to_contain_text("You")


def test_fe03_ac3_start_a_direct_conversation(page, mock_url):
    sign_in(page, mock_url, "alice")

    page.get_by_label("Colleague").select_option(label="Grace Okafor (grace)")
    page.get_by_role("button", name="Start").click()

    expect(page.get_by_role("heading", name="Grace Okafor")).to_be_visible()
    expect(page.get_by_test_id("empty-messages")).to_have_text("No messages yet. Say hello!")


def test_fe03_ac3_markup_in_a_message_is_shown_as_plain_text(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")
    text = "<b>bold?</b> <i>no</i>"

    send_message(page, text)

    body = page.get_by_test_id("message-body").last
    expect(body).to_have_text(text)
    expect(body.locator("b, i")).to_have_count(0)  # SR-VAL-02 / SR-FE-03


def test_fe03_ac4_empty_states(page, mock_url):
    # Empty conversation list: a brand-new user.
    page.goto(f"{mock_url}/register")
    page.get_by_label("Username").fill("dave")
    page.get_by_label("Display name").fill("Dave Test")
    page.get_by_label("Password", exact=True).fill("correct-horse-2026")
    page.get_by_label("Confirm password").fill("correct-horse-2026")
    page.get_by_role("button", name="Create account").click()
    expect(page.get_by_text("Account created. You can sign in.")).to_be_visible()
    sign_in(page, mock_url, "dave", "correct-horse-2026")
    expect(page.get_by_test_id("empty-conversations")).to_be_visible()


def test_fe03_ac4_error_states_for_forbidden_and_missing_conversations(page, mock_url):
    sign_in(page, mock_url, "alice")

    page.goto(f"{mock_url}/conversations/2")  # #legal-team: alice is not a participant
    expect(page.get_by_role("alert")).to_have_text("You are not a participant of this conversation.")
    expect(page.get_by_role("link", name="Back to conversations")).to_be_visible()

    page.goto(f"{mock_url}/conversations/999")
    expect(page.get_by_role("alert")).to_have_text("Conversation not found.")


def _layout_boxes(browser: Browser, mock_url: str, width: int, height: int):
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")
    messages = page.get_by_role("list", name="Messages in #general").bounding_box()
    members = page.get_by_role("heading", name="Members (4)").bounding_box()
    no_horizontal_scroll = page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    composer_visible = page.get_by_label("Message", exact=True).is_visible()
    context.close()
    return messages, members, no_horizontal_scroll, composer_visible


def test_fe03_ac5_layout_on_desktop_and_mobile(browser, mock_url):
    messages, members, fits, composer = _layout_boxes(browser, mock_url, 1280, 800)
    assert fits and composer
    assert members["x"] >= messages["x"] + messages["width"] - 1, "desktop: members beside messages"

    messages, members, fits, composer = _layout_boxes(browser, mock_url, 375, 740)
    assert fits, "mobile: no horizontal scrolling"
    assert composer
    assert members["y"] >= messages["y"] + messages["height"] - 1, "mobile: members stacked below"
