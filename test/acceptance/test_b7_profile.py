"""Story B7 — profile screen (blueprint scope; no FE backlog issue covers it yet). Mock build."""

import base64

import pytest
from playwright.sync_api import expect

from conftest import sign_in

pytestmark = pytest.mark.acceptance

# Smallest valid PNG (1x1 pixel).
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_b7_profile_name_and_avatar_rules(page, mock_url):
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
