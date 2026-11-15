"""FE-05 (#14) — Attachments and confidentiality controls. Mock build.

Server-side enforcement (type, size, membership on download) waits for BE-07 (#13).
"""

import re

import pytest
from playwright.sync_api import expect

from conftest import open_conversation, send_message, sign_in

pytestmark = pytest.mark.acceptance


def open_general(page, mock_url):
    sign_in(page, mock_url, "alice")
    open_conversation(page, "#general")


def test_fe05_ac1_allowed_types_and_size_feedback(page, mock_url, tmp_path):
    open_general(page, mock_url)
    picker = page.get_by_test_id("attachment-input")

    picker.set_input_files({"name": "notes.txt", "mimeType": "text/plain", "buffer": b"hello world"})
    expect(page.get_by_test_id("selected-file")).to_contain_text("notes.txt — 11 B")

    picker.set_input_files({"name": "tool.exe", "mimeType": "application/x-msdownload", "buffer": b"MZ"})
    expect(page.get_by_role("alert")).to_contain_text("This file type is not allowed.")
    expect(page.get_by_test_id("selected-file")).to_have_count(0)

    big = tmp_path / "big.pdf"  # a real file: large in-memory buffers are slow over the protocol
    big.write_bytes(bytes(6 * 1024 * 1024))
    picker.set_input_files(str(big))
    expect(page.get_by_role("alert")).to_contain_text("Attachments are limited to 5 MB (this file: 6.0 MB).")


def test_fe05_ac2_user_sets_the_classification(page, mock_url):
    open_general(page, mock_url)

    page.get_by_test_id("attachment-input").set_input_files(
        {"name": "contract.txt", "mimeType": "text/plain", "buffer": b"draft terms"}
    )
    page.get_by_label("Mark as confidential").check()
    send_message(page, "Draft contract attached")

    chip = page.get_by_test_id("attachment").last
    expect(chip).to_contain_text("contract.txt")
    expect(chip).to_contain_text("Confidential")

    page.get_by_test_id("attachment-input").set_input_files(
        {"name": "agenda.txt", "mimeType": "text/plain", "buffer": b"agenda"}
    )
    send_message(page, "Agenda, not confidential")
    expect(page.get_by_test_id("attachment").last).not_to_contain_text("Confidential")


def test_fe05_ac3_attachment_is_a_download_link(page, mock_url):
    open_general(page, mock_url)
    page.get_by_test_id("attachment-input").set_input_files(
        {"name": "minutes.txt", "mimeType": "text/plain", "buffer": b"minutes"}
    )
    send_message(page, "Minutes")

    link = page.get_by_test_id("attachment").last.get_by_role("link", name=re.compile("minutes.txt"))
    expect(link).to_have_attribute("download", "minutes.txt")
    # Live builds only keep same-origin /api/attachments/{id} links (SR-FE-03); checked on BE-07.


def test_fe05_ac4_upload_progress_is_displayed(page, mock_url):
    open_general(page, mock_url)
    page.get_by_test_id("attachment-input").set_input_files(
        {"name": "report.pdf", "mimeType": "application/pdf", "buffer": bytes(300 * 1024)}
    )

    send_message(page, "Quarterly report")

    page.get_by_text(re.compile(r"Uploading… \d+%")).wait_for(state="visible")
    expect(page.get_by_test_id("attachment").last).to_contain_text("report.pdf (300.0 KB)")
    expect(page.get_by_text(re.compile(r"Uploading…"))).to_have_count(0)
