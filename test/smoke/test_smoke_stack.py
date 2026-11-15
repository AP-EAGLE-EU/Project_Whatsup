"""Smoke tests: is the live stack up and wired end to end? (fast, run after every start)

Chain under test: browser -> frontend nginx (:3000) -> FastAPI backend -> MySQL.
"""

import re

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.smoke


def test_frontend_healthz_answers(http, live_url):
    response = http.get(f"{live_url}/healthz")

    assert response.status_code == 200
    assert response.text == "ok"


def test_index_page_is_served(http, live_url):
    response = http.get(f"{live_url}/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert '<div id="root"></div>' in response.text


def test_deep_links_fall_back_to_the_single_page_app(http, live_url):
    response = http.get(f"{live_url}/conversations/1")

    assert response.status_code == 200
    assert '<div id="root"></div>' in response.text


def test_built_javascript_bundle_is_served(http, live_url):
    index = http.get(f"{live_url}/").text
    script = re.search(r'src="(/assets/[^"]+\.js)"', index)
    assert script is not None, "index.html should reference the built bundle"

    response = http.get(f"{live_url}{script.group(1)}")

    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]


def test_backend_health_through_the_proxy(http, live_url):
    response = http.get(f"{live_url}/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_greeting_through_the_proxy(http, live_url):
    response = http.get(f"{live_url}/api/greetings/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "hello"}


def test_configured_baseline_headers_are_still_present(http, live_url):
    # Regression guard on the nginx configuration (SR-CONF-01); the full header
    # audit stays a human-executed assessment step (EH-13).
    headers = http.get(f"{live_url}/").headers

    assert "default-src 'self'" in headers.get("content-security-policy", "")
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_application_boots_in_a_real_browser(page, live_url):
    page.goto(f"{live_url}/")

    expect(page).to_have_url(re.compile(r"/login$"))
    expect(page.get_by_role("heading", name="Sign in")).to_be_visible()
