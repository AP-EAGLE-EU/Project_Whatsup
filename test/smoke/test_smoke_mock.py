"""Smoke tests for the mock build of the front-end (VITE_API_MODE=mock)."""

import re

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.smoke


def test_mock_frontend_is_served(http, mock_url):
    response = http.get(f"{mock_url}/")

    assert response.status_code == 200
    assert '<div id="root"></div>' in response.text


def test_mock_build_announces_itself(page, mock_url):
    page.goto(f"{mock_url}/")

    expect(page).to_have_url(re.compile(r"/login$"))
    expect(page.get_by_text("Mock mode")).to_be_visible()
    expect(page.get_by_text("Demo accounts:")).to_be_visible()
