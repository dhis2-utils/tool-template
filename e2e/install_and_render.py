#!/usr/bin/env python3
"""Install the built tool-template zip on a DHIS2 instance and verify it renders.

Usage:
  DHIS2_URL=http://dhis2-agent-x:8080 DHIS2_USER=local_admin DHIS2_PASS=district \
  LABEL=2.40 ZIP=compiled/tool-template.zip SHOT_DIR=docs/review-x/screenshots \
  python3 e2e/install_and_render.py

Prints a JSON result object as the last line of output.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

BASE = os.environ["DHIS2_URL"].rstrip("/")
USER = os.environ.get("DHIS2_USER", "local_admin")
PASS = os.environ["DHIS2_PASS"]
LABEL = os.environ.get("LABEL", "unknown")
ZIP = os.environ.get("ZIP", "compiled/tool-template.zip")
SHOT_DIR = os.environ.get("SHOT_DIR", ".")
APP_KEY = "tool-template"

AUTH = "Basic " + base64.b64encode(f"{USER}:{PASS}".encode()).decode()
result = {"label": LABEL, "steps": {}, "console": [], "page_errors": [],
          "failed_requests": [], "http_errors": []}


def api(path, method="GET"):
    req = urllib.request.Request(BASE + path, headers={"Authorization": AUTH}, method=method)
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return r.status, json.loads(body) if body else None


def get_session_cookie():
    req = urllib.request.Request(BASE + "/api/me", headers={"Authorization": AUTH})
    with urllib.request.urlopen(req) as r:
        for c in r.headers.get_all("Set-Cookie") or []:
            head = c.split(";", 1)[0]
            n, _, v = head.partition("=")
            if "JSESSIONID" in n:
                return n.strip(), v.strip()
    raise RuntimeError("No JSESSIONID returned from /api/me")


# --- 1. server version ---
_, info = api("/api/system/info.json")
result["server_version"] = info.get("version")
result["steps"]["server_reachable"] = "PASS"

# --- 2. install app zip (accept any 2xx) ---
cp = subprocess.run(
    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-u", f"{USER}:{PASS}",
     "-F", f"file=@{ZIP}", f"{BASE}/api/apps"],
    capture_output=True, text=True)
code = cp.stdout.strip()
result["steps"]["install_zip"] = f"PASS ({code})" if code.startswith("2") else f"FAIL ({code})"
if not code.startswith("2"):
    print(json.dumps(result, indent=2))
    sys.exit(1)

# verify after write: app listed
time.sleep(2)
_, apps = api("/api/apps.json")
listed = [a for a in (apps if isinstance(apps, list) else apps.get("apps", []))
          if a.get("key") == APP_KEY or a.get("name") == APP_KEY]
result["steps"]["app_listed"] = "PASS" if listed else "FAIL"
launch_path = f"/api/apps/{APP_KEY}/index.html"

# --- 3. render test with Playwright ---
from playwright.sync_api import sync_playwright  # noqa: E402

cookie_name, cookie_value = get_session_cookie()
host = re.sub(r"^https?://", "", BASE).split(":")[0]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_cookies([{"name": cookie_name, "value": cookie_value,
                      "domain": host, "path": "/"}])
    page = ctx.new_page()
    page.on("console", lambda m: result["console"].append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: result["page_errors"].append(str(e)))
    page.on("requestfailed", lambda r: result["failed_requests"].append(
        f"{r.url} :: {r.failure}"))
    page.on("response", lambda r: result["http_errors"].append(
        f"{r.status} {r.url}") if r.status >= 400 else None)

    dialogs = []
    page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))

    page.goto(BASE + launch_path, wait_until="networkidle", timeout=60_000)

    # Frame-aware: 2.42+ serves apps inside a global-shell iframe
    app_frame = None
    deadline = time.time() + 30
    while time.time() < deadline and app_frame is None:
        for f in page.frames:
            try:
                if f.locator("#mainView").count() > 0:
                    app_frame = f
                    break
            except Exception:
                pass
        if app_frame is None:
            time.sleep(1)
    result["in_iframe"] = bool(app_frame and app_frame != page.main_frame)
    result["steps"]["app_renders"] = "PASS" if app_frame else "FAIL (no #mainView in any frame)"

    if app_frame:
        content_ok = app_frame.get_by_text("Content goes here").count() > 0
        button = app_frame.locator("button", has_text="Hello")
        result["steps"]["content_visible"] = "PASS" if content_ok else "FAIL"
        result["steps"]["hello_button_present"] = "PASS" if button.count() else "FAIL"

        # header bar behaviour: legacy bar (<2.42) vs hidden div (>=2.42)
        hb = app_frame.locator("#dhis-header-bar")
        page.wait_for_timeout(5000)  # give the header-bar script time to load/decide
        hb_state = "absent"
        if hb.count():
            visible = hb.evaluate("el => getComputedStyle(el).display !== 'none'")
            children = hb.evaluate("el => el.children.length")
            hb_state = f"visible={visible}, children={children}"
        result["header_bar"] = hb_state

        # click Hello -> app calls /api/system/info then alert()
        if button.count():
            button.first.click()
            deadline = time.time() + 15
            while time.time() < deadline and not dialogs:
                page.wait_for_timeout(500)
            result["steps"]["hello_alert"] = (
                f"PASS ({dialogs[0]!r})" if dialogs else "FAIL (no alert)")
            version_logged = any(re.search(r"\d+\.\d+", c) and "log:" in c
                                 for c in result["console"])
            result["steps"]["api_call_logged_version"] = (
                "PASS" if version_logged else "FAIL (no version in console)")

    os.makedirs(SHOT_DIR, exist_ok=True)
    shot = os.path.join(SHOT_DIR, f"{LABEL}-app.png")
    page.screenshot(path=shot, full_page=True)
    result["screenshot"] = shot
    browser.close()

# --- 4. uninstall (cleanup) ---
cp = subprocess.run(
    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-u", f"{USER}:{PASS}",
     "-X", "DELETE", f"{BASE}/api/apps/{APP_KEY}"],
    capture_output=True, text=True)
result["steps"]["uninstall"] = f"{'PASS' if cp.stdout.strip().startswith('2') else 'WARN'} ({cp.stdout.strip()})"

print(json.dumps(result, indent=2))
