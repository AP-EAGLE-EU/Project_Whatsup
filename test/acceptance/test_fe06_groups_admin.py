"""FE-06 (#16) — Group management and admin screens. Mock build.

Server-side enforcement of every membership/role change waits for BE-08 (#15).
"""

import pytest
from playwright.sync_api import expect

from conftest import open_conversation, sign_in, sign_out

pytestmark = pytest.mark.acceptance


def test_fe06_ac1_group_manager_views_and_edits_membership(page, mock_url):
    grace = page
    alice = page.context.new_page()
    alice.set_default_timeout(10_000)
    sign_in(alice, mock_url, "alice")
    sign_in(grace, mock_url, "grace")
    open_conversation(grace, "#legal-team")
    expect(grace.get_by_test_id("member")).to_have_count(2)

    grace.get_by_label("Add a member").select_option(label="Alice Martin (alice)")
    grace.get_by_role("button", name="Add", exact=True).click()
    expect(grace.get_by_text("Alice Martin was added.")).to_be_visible()
    expect(grace.get_by_test_id("member")).to_have_count(3)
    # Alice sees the new group appear without reloading.
    expect(alice.get_by_role("link", name="#legal-team", exact=True)).to_be_visible()

    grace.get_by_role("button", name="Remove Bob Singh").click()
    expect(grace.get_by_text("Bob Singh was removed.")).to_be_visible()
    expect(grace.get_by_test_id("member").filter(has_text="Bob Singh")).to_have_count(0)


def test_fe06_ac2_admin_views_user_role_and_audit_screens(page, mock_url):
    sign_in(page, mock_url, "itadmin")
    page.get_by_role("link", name="Admin").click()

    expect(page.get_by_test_id("admin-user")).to_have_count(4)
    expect(page.get_by_test_id("audit-event").filter(has_text="login_success").first).to_be_visible()

    bob = page.get_by_test_id("admin-user").filter(has_text="bob")
    bob.get_by_label("Role of bob").select_option("group_manager")
    bob.get_by_role("button", name="Save").click()
    expect(page.get_by_text("bob is now Group manager.")).to_be_visible()
    expect(page.get_by_test_id("audit-event").filter(has_text="role_changed").first).to_be_visible()


def test_fe06_ac3_restricted_controls_are_hidden_for_other_roles(page, mock_url):
    sign_in(page, mock_url, "alice")
    expect(page.get_by_role("link", name="Admin")).to_have_count(0)
    expect(page.get_by_role("heading", name="New group")).to_have_count(0)
    open_conversation(page, "#general")
    expect(page.get_by_label("Add a member")).to_have_count(0)
    expect(page.get_by_role("button", name="Remove", exact=False)).to_have_count(0)
    sign_out(page)

    # Grace is a member of #it-ops but not its manager: no controls there.
    sign_in(page, mock_url, "grace")
    expect(page.get_by_role("heading", name="New group")).to_be_visible()
    open_conversation(page, "#it-ops")
    expect(page.get_by_test_id("member")).to_have_count(2)
    expect(page.get_by_label("Add a member")).to_have_count(0)


def test_fe06_ac4_server_side_authorisation_remains_final(page, mock_url):
    # The UI hides the page, but even typing the URL only shows a refusal: the data
    # comes from admin endpoints that answer 403 to non-admins (BE-08, SR-AC-04).
    sign_in(page, mock_url, "alice")
    page.goto(f"{mock_url}/admin")
    expect(page.get_by_role("alert")).to_have_text("This page is reserved for organisation IT admins.")
    expect(page.get_by_test_id("admin-user")).to_have_count(0)


def test_fe06_ac5_empty_error_and_success_states(page, mock_url):
    sign_in(page, mock_url, "grace")

    page.get_by_label("Group name").fill("design-review")
    page.get_by_role("button", name="Create group").click()
    expect(page.get_by_role("heading", name="#design-review")).to_be_visible()
    expect(page.get_by_test_id("empty-messages")).to_be_visible()
    expect(page.get_by_test_id("member")).to_have_count(1)

    page.get_by_role("link", name="Conversations", exact=True).click()
    page.get_by_label("Group name").fill("design-review")
    page.get_by_role("button", name="Create group").click()
    expect(page.get_by_role("alert")).to_have_text("A group with this name already exists.")
    sign_out(page)

    sign_in(page, mock_url, "itadmin")
    page.get_by_role("link", name="Admin").click()
    expect(page.get_by_test_id("empty-reports")).to_have_text("No reported message. Good news.")
