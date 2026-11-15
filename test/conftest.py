"""Shared fixtures for the WhatsUp smoke and acceptance suites.

LIVE_BASE_URL: the real stack (front nginx -> FastAPI -> MySQL).
MOCK_BASE_URL: the same front built with VITE_API_MODE=mock (no back-office needed).
Defaults target the ports published on the host, so the suites also run outside Docker.
"""

import os
import re

import httpx
import pytest
from playwright.sync_api import Browser, Page, expect, sync_playwright

LIVE_BASE_URL = os.environ.get("LIVE_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
MOCK_BASE_URL = os.environ.get("MOCK_BASE_URL", "http://127.0.0.1:3001").rstrip("/")

# Fictional demo accounts that exist only in the mock build (src/frontend/src/services/mock).
DEMO_PASSWORD = "demo-password-2026"


@pytest.fixture(scope="session")
def live_url() -> str:
    return LIVE_BASE_URL


@pytest.fixture(scope="session")
def mock_url() -> str:
    return MOCK_BASE_URL


@pytest.fixture(scope="session")
def http():
    with httpx.Client(timeout=10, follow_redirects=False) as client:
        yield client


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as playwright:
        chromium = playwright.chromium.launch()
        yield chromium
        chromium.close()


@pytest.fixture
def page(browser: Browser):
    # A fresh context per test = fresh cookies and sessionStorage = fresh mock data.
    context = browser.new_context()
    new_page = context.new_page()
    new_page.set_default_timeout(10_000)
    yield new_page
    context.close()


def sign_in(page: Page, base_url: str, username: str, password: str = DEMO_PASSWORD) -> None:
    page.goto(f"{base_url}/login")
    page.get_by_label("Username").fill(username)
    page.get_by_label("Password", exact=True).fill(password)
    page.get_by_role("button", name="Sign in").click()
    expect(page).to_have_url(re.compile(r"/channels$"))
