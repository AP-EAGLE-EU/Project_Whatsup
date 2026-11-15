# Test runner image: Python + Playwright with Chromium already installed.
FROM mcr.microsoft.com/playwright/python:v1.52.0-noble

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1

WORKDIR /tests
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY pytest.ini conftest.py ./
COPY smoke/ ./smoke/
COPY acceptance/ ./acceptance/

CMD ["python", "-m", "pytest"]
