# WhatsUp — smoke and acceptance tests

Two suites, both run **inside Docker**, so nothing needs installing on Windows (no Python, no
Node, no browser driver):

- **smoke/**: is the stack up and wired? (nginx, SPA, `/api` proxy, FastAPI, MySQL, headers, browser boot)
- **acceptance/**: does each front issue of the group backlog behave as agreed?
  - one file per GitHub issue, one test per acceptance checkbox: `test_fe02_ac4_…` = FE-02, 4th checkbox
  - `test_fe02_login.py` to `test_fe07_reports_audit.py`: on the mock build (every screen)
  - `test_acceptance_live.py`: on the real stack (today's back-office)

Stack used by the tests:

- `frontend` on http://127.0.0.1:3000 (live: nginx, then FastAPI, then MySQL)
- `frontend-mock` on http://127.0.0.1:3001 (same front, demo data in the browser)
- `tests`: pytest + Playwright Chromium, on the internal Docker network

The acceptance criteria come from the GitHub issues FE-02 to FE-07. The table in
`Project/04. Stories/B7-front-end-screens.md` §4 lists them, with their code and test.
These are **functional** tests. The security assessment (stories A2 to A6) stays a
human-executed activity, following `Project/04. Stories/Ethical-Hacking-scenario.md`.

---

## Part 1. Run the tests

### From WSL (Ubuntu) or Git Bash: one command

1. Open the Ubuntu terminal.
2. Go to the project:

   ```bash
   cd "/mnt/c/Users/USER05/Nextcloud/Shared/16.Ambroise/vscode/Project_Whatsup"
   ```

3. Run everything:

   ```bash
   bash test/run-tests.sh
   ```

   Or only one suite: `bash test/run-tests.sh smoke` or `bash test/run-tests.sh acceptance`.

You should see:

- `== Starting the stack …`, then the containers become `Healthy`
- one dot per test, then a line like `45 passed in 68.88s`
- `== Done. JUnit report: test/reports/junit.xml`

The first run takes several minutes, because it downloads the Playwright image (about 2 GB).

### From PowerShell: two commands

```powershell
cd "C:\Users\USER05\Nextcloud\Shared\16.Ambroise\vscode\Project_Whatsup"
docker compose -f compose.yaml -f test/compose.test.yaml --profile test up --build --detach --wait frontend frontend-mock
docker compose -f compose.yaml -f test/compose.test.yaml --profile test run --rm --build tests
```

If `.env` does not exist yet, copy it first: `copy .env.example .env`.

### Click through the mock demo

After a run, the mock front stays up on **http://127.0.0.1:3001**.

- Users: `alice`, `bob`, `grace`, `itadmin` (Acme Legal) and `mallory` (Globex Finance)
- Password for all: `demo-password-2026`
- These accounts are fictional and exist **only** in the mock build.
- To see live chat, open **two tabs**: sign in as `alice` in one and `bob` in the other, then
  open `#general` in both. The tabs share the demo data; each tab keeps its own session.
- To reset the demo data, open the browser developer tools (F12), then **Application**, then
  **Local storage**, then delete `whatsup-mock-data-v2`.

### Stop everything

```bash
npm run stop
```

Without Node on the PC, use: `docker compose -f compose.yaml -f test/compose.test.yaml --profile test down`.
Database data is kept in the `mysql_data` volume.

---

## Part 2. Set up the PC (Windows 11 + Docker Desktop + WSL)

Do this once. Each step is one action.

### 2.1 Docker Desktop uses WSL 2

1. Open Docker Desktop.
2. Click the gear icon (**Settings**).
3. Click **General**.
4. Check that **Use the WSL 2 based engine** is ticked.

### 2.2 Give Ubuntu access to Docker

1. In Docker Desktop **Settings**, click **Resources**.
2. Click **WSL integration**.
3. Turn on the switch next to **Ubuntu**.
4. Click **Apply & restart**.
5. In the Ubuntu terminal, type `docker version`.

You should see two blocks: **Client** and **Server**. If you see `command not found`, repeat 2.2.

### 2.3 Let WSL reach http://127.0.0.1:3000 (only needed for tools run directly in WSL)

The test runner does not need this, because it runs inside Docker. It is only needed when you
open the app from a WSL tool such as `curl`.

1. In Windows, open Notepad.
2. Paste:

   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

3. Save as `C:\Users\USER05\.wslconfig`. Choose **All files**, not `.txt`.
4. In PowerShell, run `wsl --shutdown`.
5. Open Ubuntu again and run `curl -s http://127.0.0.1:3000/healthz`.

You should see: `ok` (the stack must be running).

### 2.4 Optional: Kali Linux in WSL

There is enough space: 1.7 TB is free on C: (checked 2026-11-15). Kali in WSL takes about 2 GB.
The command-line tool set, if you add it, takes about 10 GB more.

1. In PowerShell, run `wsl --install -d kali-linux`.
2. When Kali opens, choose a UNIX username and password. This password is local to Kali.
3. In Kali, run `sudo apt update && sudo apt full-upgrade -y`.
4. Optional, the command-line tool set: `sudo apt install -y kali-linux-headless`.
5. Give Kali access to Docker: repeat step 2.2 and turn on **kali-linux**.
6. Check it with `wsl -l -v` in PowerShell.

You should see: `Ubuntu`, `docker-desktop` and `kali-linux`, all with VERSION `2`.

Before using any security tool, read the rules of engagement in
`Project/04. Stories/Ethical-Hacking-scenario.md` §1. The only authorised target is your own
local WhatsUp stack (`127.0.0.1:3000`). Humans run the tests and capture the evidence.

---

## Reference: which test checks what

| Test file | Checks | Story / SR |
|---|---|---|
| `smoke/test_smoke_stack.py` | healthz, index, SPA deep link, JS bundle, `/api/health`, DB greeting, baseline headers, browser boot | B0, B7 · SR-CONF-01 (regression guard) |
| `smoke/test_smoke_mock.py` | mock front served, "Mock mode" badge, demo-account notice | B7 · SR-FE-06 |
| `acceptance/test_acceptance_live.py` | Status + greeting, FE-02 AC3 and AC5 on the live stack (AC5 adapts when BE-03 lands) | FE-02 #7 · BE-01 #2 |
| `acceptance/test_fe02_login.py` | AC1 to AC4: validation and errors, sign-in, sign-out, session expiry | FE-02 #7 · SR-AUTH-03, SR-AUTH-05 |
| `acceptance/test_fe03_conversations.py` | AC1 to AC5: list (own organisation only), history, send, direct message, plain-text markup, empty and error states, desktop and mobile layout | FE-03 #10 · SR-AC-02/03, SR-VAL-02 |
| `acceptance/test_fe04_realtime.py` | AC1 to AC4: two tabs chat live, reload, reconnect catch-up, duplicates shown once | FE-04 #12 · SR-WS-03 |
| `acceptance/test_fe05_attachments.py` | AC1 to AC4: allowed types, size feedback, confidential flag, download link, progress | FE-05 #14 · SR-FILE-01 |
| `acceptance/test_fe06_groups_admin.py` | AC1 to AC5: manager adds and removes members, admin users and audit, hidden controls, refusal, empty, error and success states | FE-06 #16 · SR-AC-02/04 |
| `acceptance/test_fe07_reports_audit.py` | AC1 to AC4: report with confirmation, admin reports list, privileged views refused, manipulated routes | FE-07 #18 · SR-AC-03/04, SR-LOG-01 |
| `acceptance/test_b7_profile.py` | display name, avatar rules (no backlog issue yet) | B7 · SR-FILE-01 |

Run outside Docker (advanced): `pip install -r test/requirements.txt`, then
`playwright install chromium`, then `cd test && pytest`. The defaults target 127.0.0.1:3000
and 127.0.0.1:3001.
