"""Acceptance tests on the LIVE stack — what the front does with today's back-office.

These tests stay valid when the BE issues land: they adapt to whether an endpoint exists.
The "against the real backend" checkboxes of FE-02…FE-07 are ticked only when the matching
BE issue is merged and these tests (plus a manual run) pass on the live stack.
"""

import re

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.acceptance


def test_live_status_screen_shows_the_database_greeting(page, live_url):
    # BE-01 (#2) / FE-01 (#3): browser -> nginx -> FastAPI -> MySQL.
    page.goto(f"{live_url}/status")

    expect(page.get_by_test_id("health")).to_have_text("ok")
    page.get_by_role("button", name="Fetch hello").click()
    expect(page.get_by_test_id("greeting")).to_have_text("hello")


def test_live_fe02_ac5_sign_in_reports_whether_backend_auth_exists(page, http, live_url):
    # FE-02 AC5 "Authentication is verified against the real backend" — waits for BE-03 (#6).
    auth_probe = http.get(f"{live_url}/api/auth/me")
    page.goto(f"{live_url}/login")
    notice = page.get_by_text("does not provide sign-in yet")

    if auth_probe.status_code == 404:
        expect(notice).to_be_visible()  # BE-03 not merged: the user is told, not left guessing.
    else:
        assert auth_probe.status_code == 401, "signed-out /api/auth/me must answer 401"
        expect(notice).to_have_count(0)


def test_live_fe02_ac3_protected_screens_redirect_to_sign_in(page, live_url):
    for path in ("/conversations", "/conversations/1", "/profile", "/admin"):
        page.goto(f"{live_url}{path}")
        expect(page).to_have_url(re.compile(r"/login$"))


def test_live_status_screen_shows_live_mode(page, live_url):
    page.goto(f"{live_url}/status")

    expect(page.get_by_test_id("api-mode")).to_have_text("live")
    expect(page.get_by_test_id("realtime-status")).to_have_text("Sign in to connect")
