"""Acceptance tests on the LIVE stack — what the front does with today's back-office.

Story B7, acceptance criteria AC-L1 … AC-L4 (Project/04. Stories/B7-front-end-screens.md).
Written to stay valid when B1 lands: AC-L2 adapts to whether /api/auth exists.
"""

import re

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.acceptance


def test_ac_l1_status_screen_shows_the_database_greeting(page, live_url):
    page.goto(f"{live_url}/status")

    expect(page.get_by_test_id("health")).to_have_text("ok")
    page.get_by_role("button", name="Fetch hello").click()
    expect(page.get_by_test_id("greeting")).to_have_text("hello")


def test_ac_l2_sign_in_screen_reports_whether_back_office_auth_exists(page, http, live_url):
    auth_probe = http.get(f"{live_url}/api/auth/me")
    page.goto(f"{live_url}/login")
    notice = page.get_by_text("does not provide sign-in yet")

    if auth_probe.status_code == 404:
        expect(notice).to_be_visible()  # B1 not built yet: the user is told, not left guessing.
    else:
        assert auth_probe.status_code == 401, "signed-out /api/auth/me must answer 401"
        expect(notice).to_have_count(0)


def test_ac_l3_protected_screens_redirect_to_sign_in(page, live_url):
    for path in ("/channels", "/channels/1", "/profile", "/admin"):
        page.goto(f"{live_url}{path}")
        expect(page).to_have_url(re.compile(r"/login$"))


def test_ac_l4_status_screen_shows_live_mode(page, live_url):
    page.goto(f"{live_url}/status")

    expect(page.get_by_test_id("api-mode")).to_have_text("live")
