"""A local imitation of the MarktMentor Public API, for tests without a key.

    python tools/mock_api.py            # http://127.0.0.1:8787
    export MARKTMENTOR_API_BASE_URL=http://127.0.0.1:8787
    export MARKTMENTOR_API_KEY=mm_live_demo

The public test key `mm_test_demo` works too: HTTP 404 with a hint for other
product codes and niche ids, 30 requests per minute with the RateLimit-*
headers, and the header X-MarktMentor-Test-Key: true. Demo mode of the example
app sends this key. The real API filters, sorts and pages within the closed
set of the test key. This mock does not: it gives the fixed example answers
(page 2 and later are empty).

It answers with the sample data in demo-data/demo.json (store ratios in
percent, the free reference endpoints) and imitates the
behaviour that a client must handle: the Bearer check (401), the trailing
slash (301), an unknown path (HTML 404), pagination, the quota headers, the
end of the bundle (402), the rate limit per call group (429 with Retry-After),
the history interval check and whole-number parameters (400), and `ean:` in
product paths (404 and 409).

Settings (environment variables):
    MOCK_PORT       default 8787
    MOCK_REMAINING  research requests left in the fake bundle, default 40
    MOCK_RATE       requests per minute per call group (research, store,
                    account) before HTTP 429, default 60 as on the real API
                    (reference: 120)
    MOCK_PAGES      pages per list, default 3 (the same sample rows each page)
    MOCK_DELAY_MS   wait this long before each research answer, default 0
                    (to see loading states)
    MOCK_NO_BUNDLE  1: Premium without a bundle: the 100 free requests per
                    month (plan "free", at most 25 results per page, HTTP 402
                    free_quota_exhausted at the end). MOCK_REMAINING is then
                    the number of free requests left (at most 100).
    MOCK_NO_PREMIUM 1: no paid Premium subscription (HTTP 403
                    subscription_required on research, plan "none")
    MOCK_PAYMENT_FAILED  1: the payment for the bundle failed
                    (HTTP 403 bundle_payment_failed on research)
    MOCK_STORE_DOWN 1: the store data source is away (HTTP 503 store_unavailable)
    MOCK_TEST_KEY_ONLY  1: accept only the test key; any other credential or
                    an X-Organization-ID header gets HTTP 401 and the log line
                    "mock: REJECTED" (the demo-mode tests check this)
"""

import json
import os
import re
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

DEMO = json.loads(
    (Path(__file__).resolve().parents[1] / "demo-data" / "demo.json").read_text()
)
PREFIX = "/api/public/v1/"
TEST_KEY = "mm_test_demo"
TEST_KEY_RATE = 30
LIMIT = 1000
STATE = {
    "remaining": int(os.environ.get("MOCK_REMAINING", "40")),
    "rate": int(os.environ.get("MOCK_RATE", "60")),
    "pages": int(os.environ.get("MOCK_PAGES", "3")),
    "no_bundle": os.environ.get("MOCK_NO_BUNDLE") == "1",
    "no_premium": os.environ.get("MOCK_NO_PREMIUM") == "1",
    "payment_failed": os.environ.get("MOCK_PAYMENT_FAILED") == "1",
    "store_down": os.environ.get("MOCK_STORE_DOWN") == "1",
    "test_key_only": os.environ.get("MOCK_TEST_KEY_ONLY") == "1",
    "delay": int(os.environ.get("MOCK_DELAY_MS", "0")) / 1000,
    # Per call group: the times of the requests of the last 60 seconds.
    "windows": {},
}
# The handler runs in threads: hold this lock when you change STATE.
LOCK = threading.Lock()
REFERENCE_RATE = 120
# Query parameters that must be whole numbers.
INT_PARAMS = ("page", "pageSize", "level", "parentId")
RESET = "2026-12-12T08:00:00+00:00"
FREE_LIMIT = 100
FREE_PAGE_SIZE = 25
FREE_RESET = "2026-12-01T00:00:00+00:00"
if STATE["no_bundle"]:
    STATE["remaining"] = min(STATE["remaining"], FREE_LIMIT)
# `ean:` in a product path: the sample products resolve; this EAN (the one in
# the docs) is on two products, so it gets HTTP 409 ambiguous_ean.
AMBIGUOUS_EAN = "8712345678901"
HISTORY_ROUTES = {
    "research/products/{product_code}/sales-history/",
    "research/products/{product_code}/visibility-history/",
    "research/products/{product_code}/category-rankings/",
    "research/products/{product_code}/keyword-rankings/",
    "research/niches/{niche_id}/review-history/",
}


def _test_key_products():
    product = next(
        p
        for p in DEMO["routes"]["research/products/"]["response"]["data"]
        if p["productCode"] == DEMO["productCode"]
    )
    return {DEMO["productCode"], f"ean:{product['ean']}"}


TEST_KEY_PRODUCTS = _test_key_products()


def history_error(query):
    """The interval check of the history routes: week or month, 2Y only per month."""
    period = query.get("period", ["3M"])[0]
    interval = query.get("interval", ["month"])[0]
    if interval not in ("week", "month"):
        return {"interval": [f'"{interval}" is not a valid choice.']}
    if period == "2Y" and interval != "month":
        return {"interval": ["Use interval=month for period=2Y."]}
    return None


def ean_error(path):
    """Resolve `ean:<13 digits>` as the API does: None, or (status, body)."""
    m = re.match(r"^research/products/ean:([^/]*)/", path)
    if not m:
        return None
    ean = m.group(1)
    if not re.fullmatch(r"\d{13}", ean):
        return 404, {
            "code": "product_not_found",
            "detail": "Use ean: with an EAN of 13 digits, "
            "for example ean:8712345678901.",
        }
    if ean == AMBIGUOUS_EAN:
        return 409, {
            "code": "ambiguous_ean",
            "detail": f"More than one bol product has EAN {ean}. "
            "Use the product code of the product that you want.",
            "candidates": [
                {"productCode": "9300000012345678", "title": "Drinkfles 500 ml"},
                {"productCode": "9300000087654321", "title": "Drinkfles 500 ml blauw"},
            ],
        }
    known = {
        p.get("ean") for p in DEMO["routes"]["research/products/"]["response"]["data"]
    }
    if ean not in known:
        return 404, {
            "code": "product_not_found",
            "detail": f"No bol product has EAN {ean}.",
        }
    return None


def int_errors(query):
    """HTTP 400 field errors for a query value that is not a whole number."""
    errors = {}
    for name in INT_PARAMS:
        for value in query.get(name, []):
            try:
                int(value)
            except ValueError:
                errors[name] = ["A valid integer is required."]
    return errors or None


def invalid_query(errors):
    return {
        "code": "invalid_query",
        "detail": "Query parameters are invalid.",
        "errors": errors,
    }


def call_group(route):
    """The rate limit group of a route, as on the real API."""
    for group in ("research", "store", "reference"):
        if route.startswith(f"{group}/"):
            return group
    return "account"  # organizations/ and usage/


def take_slot(window_key, limit):
    """Count one request in a 60-second window.

    Returns (RateLimit-* headers, seconds to wait or None when allowed).
    """
    now = time.time()
    with LOCK:
        window = [t for t in STATE["windows"].get(window_key, []) if now - t < 60]
        STATE["windows"][window_key] = window
        if len(window) >= limit:
            wait = max(1, int(60 - (now - window[0])))
            return {
                "RateLimit-Limit": limit,
                "RateLimit-Remaining": 0,
                "RateLimit-Reset": wait,
            }, wait
        window.append(now)
        reset = max(1, int(60 - (now - window[0])))
        return {
            "RateLimit-Limit": limit,
            "RateLimit-Remaining": max(limit - len(window), 0),
            "RateLimit-Reset": reset,
        }, None


def take_research_request():
    """Use one request of the allowance. False when nothing is left."""
    with LOCK:
        if STATE["remaining"] <= 0:
            return False
        STATE["remaining"] -= 1
        return True


def route_for(path: str):
    """Map a concrete path to a template route of the sample data."""
    path = re.sub(
        r"^research/products/[^/]+/", "research/products/{product_code}/", path
    )
    path = re.sub(r"^research/niches/\d+/", "research/niches/{niche_id}/", path)
    path = re.sub(
        r"^reference/categories/\d+/", "reference/categories/{category_id}/", path
    )
    return path if path in DEMO["routes"] else None


def is_reference(route):
    return route.startswith("reference/")


def reference_body(route, path, body, query):
    """Filter the sample categories and brands as the API does."""

    def one(key):
        return query.get(key, [None])[0]

    if route == "reference/categories/{category_id}/":
        cid = int(path.split("/")[2])
        rows = DEMO["routes"]["reference/categories/"]["response"]["data"]
        row = next((c for c in rows if c["categoryId"] == cid), None)
        return {"data": row} if row else None
    if route == "reference/categories/":
        words = (one("search") or "").lower().split()
        body["data"] = [
            c
            for c in body["data"]
            if all(w in c["name"].lower() for w in words)
            and (one("level") is None or c["level"] == int(one("level")))
            and (one("parentId") is None or c["parentId"] == int(one("parentId")))
        ]
        body["pagination"]["total"] = len(body["data"])
    if route == "reference/brands/":
        q = (one("search") or "").lower()
        body["data"] = [b for b in body["data"] if q in b["name"].lower()]
        body["hasMore"] = False
    return body


class Handler(BaseHTTPRequestHandler):
    server_version = "MarktMentorMock/1.0"

    def log_message(self, fmt, *args):
        print("mock:", fmt % args)

    def send(self, status, body=None, headers=None, html=False):
        payload = (
            body.encode()
            if html
            else json.dumps(body).encode()
            if body is not None
            else b""
        )
        self.send_response(status)
        self.send_header(
            "Content-Type", "text/html; charset=utf-8" if html else "application/json"
        )
        self.send_header("Content-Length", str(len(payload)))
        for key, value in (headers or {}).items():
            self.send_header(key, str(value))
        self.end_headers()
        self.wfile.write(payload)

    def rate_limited(self, window_key, limit, extra=None):
        """Count the request. Send HTTP 429 and return None at the limit;
        otherwise return the RateLimit-* headers for the answer."""
        rate, wait = take_slot(window_key, limit)
        if wait is None:
            return rate
        self.send(
            429,
            {"code": "rate_limit_exceeded", "detail": "Rate limit exceeded"},
            {**(extra or {}), **rate, "Retry-After": wait},
        )
        return None

    def test_key_answer(self, url):
        """The public test key: the example answers of the real API."""
        mark = {"X-MarktMentor-Test-Key": "true", "X-Request-ID": str(uuid.uuid4())}
        rate = self.rate_limited("test-key", TEST_KEY_RATE, mark)
        if rate is None:
            return None
        mark.update(rate)
        path = url.path[len(PREFIX) :]
        route = route_for(path)
        if route is None:
            return self.send(404, {"code": "not_found", "detail": "Unknown path"}, mark)
        query = parse_qs(url.query)
        if errors := int_errors(query):
            return self.send(400, invalid_query(errors), mark)

        def unknown(kind, example):
            return self.send(
                404,
                {
                    "code": "not_found",
                    "detail": f"The test key knows one example {kind}: {example}. "
                    "Use a live key for other data.",
                },
                mark,
            )

        product = re.match(r"^research/products/([^/]+)/", path)
        if product and product.group(1) not in TEST_KEY_PRODUCTS:
            return unknown("product", DEMO["productCode"])
        niche = re.match(r"^research/niches/([^/]+)/", path)
        if niche and niche.group(1) != str(DEMO["nicheId"]):
            return unknown("niche", DEMO["nicheId"])
        body = json.loads(json.dumps(DEMO["routes"][route]["response"]))
        if route == "reference/categories/{category_id}/":
            body = reference_body(route, path, body, {})
            if body is None:
                rows = DEMO["routes"]["reference/categories/"]["response"]["data"]
                return unknown(
                    "category", ", ".join(str(c["categoryId"]) for c in rows)
                )
        if route == "usage/":
            body["credential"] = "key"
        page = query.get("page", ["1"])[0]
        if isinstance(body, dict) and "pagination" in body and page != "1":
            body["data"] = []
            body["pagination"] = {
                **body["pagination"],
                "page": int(page),
                "hasNext": False,
            }
        if route.startswith("research/"):
            mark.update(
                {
                    "X-Research-Requests-Limit": 100,
                    "X-Research-Requests-Remaining": 100,
                    "X-Research-Requests-Reset": "2026-12-01T00:00:00+00:00",
                }
            )
        return self.send(200, body, mark)

    def check_auth(self):
        """Send the 401 answer and return False, or return True."""
        auth = self.headers.get("Authorization", "")
        if STATE["test_key_only"] and (
            auth != f"Bearer {TEST_KEY}" or "X-Organization-ID" in self.headers
        ):
            print("mock: REJECTED a request that is not only the test key")
            self.send(
                401,
                {"code": "authentication_failed", "detail": "Test key only"},
            )
            return False
        if not auth.startswith("Bearer "):
            self.send(
                401,
                {
                    "detail": "Authentication credentials were not provided.",
                    "code": "not_authenticated",
                },
                {"WWW-Authenticate": 'Bearer realm="MarktMentor Public API"'},
            )
            return False
        if auth[7:] != TEST_KEY and not auth[7:].startswith("mm_live_"):
            self.send(
                401,
                {
                    "detail": "Invalid or revoked API key",
                    "code": "authentication_failed",
                },
                {
                    "WWW-Authenticate": 'Bearer realm="MarktMentor Public API", '
                    'error="invalid_token"'
                },
            )
            return False
        return True

    def access_denied(self, route, headers):
        """The 403 and 503 answers of the MOCK_* settings. True when sent."""
        research = route.startswith("research/")
        if research and STATE["payment_failed"]:
            self.send(
                403,
                {
                    "code": "bundle_payment_failed",
                    "detail": "bundle_payment_failed: The payment for the API "
                    "bundle failed. The organization owner needs to update the "
                    "payment method; the bundle continues when the payment "
                    "succeeds.",
                },
                {"X-Request-ID": str(uuid.uuid4())},
            )
            return True
        if route.startswith("store/") and STATE["store_down"]:
            self.send(
                503,
                {
                    "code": "store_unavailable",
                    "detail": "Store data is temporarily unavailable. Retry later.",
                },
                {**headers, "X-Request-ID": str(uuid.uuid4())},
            )
            return True
        if research and STATE["no_premium"]:
            self.send(
                403,
                {
                    "code": "subscription_required",
                    "detail": "subscription_required: An active paid MarktMentor "
                    "Premium subscription is required for the API.",
                },
                {"X-Request-ID": str(uuid.uuid4())},
            )
            return True
        return False

    def research_gate(self, route, path, query, headers):
        """Check a research request and use one request of the allowance.

        Sends the 400, 404, 409 or 402 answer and returns True when the
        request stops here. Otherwise it adds the allowance headers.
        """
        headers["X-Request-ID"] = str(uuid.uuid4())
        # Failed responses (400, 404, 409) do not use the allowance.
        if route in HISTORY_ROUTES and (errors := history_error(query)):
            self.send(400, invalid_query(errors), headers)
            return True
        if failed := ean_error(path):
            self.send(failed[0], failed[1], headers)
            return True
        free = STATE["no_bundle"]
        limit, reset = (FREE_LIMIT, FREE_RESET) if free else (LIMIT, RESET)
        if not take_research_request():
            body = (
                {
                    "code": "free_quota_exhausted",
                    "detail": f"The {FREE_LIMIT} free requests for this month "
                    "are used up. Choose an API bundle in the dashboard to "
                    "continue, or try again after 2026-12-01.",
                }
                if free
                else {
                    "code": "bundle_exhausted",
                    "detail": "All requests of the API bundle for this "
                    "billing period are used.",
                }
            )
            self.send(
                402,
                body,
                {
                    **headers,
                    "X-Research-Requests-Limit": limit,
                    "X-Research-Requests-Remaining": 0,
                    "X-Research-Requests-Reset": reset,
                },
            )
            return True
        headers.update(
            {
                "X-Research-Requests-Limit": limit,
                "X-Research-Requests-Remaining": STATE["remaining"],
                "X-Research-Requests-Reset": reset,
            }
        )
        if free and "pageSize" in query:
            # Free requests: at most 25 results per page (the API lowers it).
            query["pageSize"] = [str(min(int(query["pageSize"][0]), FREE_PAGE_SIZE))]
        return False

    def usage_body(self, body):
        """usage/ for the MOCK_* settings and the allowance that is left."""
        free_tier = {
            "eligible": True,
            "limit": FREE_LIMIT,
            "used": 0,
            "remaining": FREE_LIMIT,
            "pageSize": FREE_PAGE_SIZE,
            "resetsAt": FREE_RESET,
        }
        body["credential"] = "key"
        if STATE["payment_failed"]:
            body.update({"plan": "none", "bundle": None, "freeTier": None})
        elif STATE["no_premium"]:
            # Not eligible: the free requests are shown, but not available.
            body.update(
                {
                    "plan": "none",
                    "bundle": None,
                    "freeTier": {**free_tier, "eligible": False},
                }
            )
        elif STATE["no_bundle"]:
            # An API key without a bundle uses the free requests too.
            body.update(
                {
                    "plan": "free",
                    "bundle": None,
                    "freeTier": {
                        **free_tier,
                        "used": FREE_LIMIT - STATE["remaining"],
                        "remaining": STATE["remaining"],
                    },
                }
            )
        else:
            body["bundle"]["remainingRequests"] = STATE["remaining"]
            body["bundle"]["usedRequests"] = LIMIT - STATE["remaining"]
            body["bundle"]["includedRequests"] = LIMIT
            body["freeTier"] = {**free_tier, "eligible": True}
        return body

    def answer(self, route, path, query, headers):
        """The 200 answer from the sample data."""
        body = json.loads(json.dumps(DEMO["routes"][route]["response"]))
        if route == "usage/":
            body = self.usage_body(body)
        body = reference_body(route, path, body, query)
        if body is None:
            return self.send(404, {"code": "not_found", "detail": "Not found."})
        if isinstance(body, dict) and "pagination" in body and not is_reference(route):
            page = int(query.get("page", ["1"])[0])
            size = int(query.get("pageSize", [body["pagination"]["pageSize"]])[0])
            rows = len(body["data"])
            body["pagination"].update(
                {
                    "page": page,
                    "pageSize": size,
                    "total": rows * STATE["pages"],
                    "hasNext": page < STATE["pages"],
                }
            )
            if page > STATE["pages"]:
                body["data"] = []
        return self.send(200, body, headers)

    def do_GET(self):
        url = urlparse(self.path)
        # As a real server: an SDK sends `ean:` as `ean%3A`.
        url = url._replace(path=unquote(url.path))
        if not url.path.startswith(PREFIX):
            return self.send(404, "<h1>Not Found</h1>", html=True)
        if not url.path.endswith("/"):
            return self.send(301, "", {"Location": url.path + "/"}, html=True)
        if not self.check_auth():
            return None
        if self.headers.get("Authorization", "")[7:] == TEST_KEY:
            return self.test_key_answer(url)
        path = url.path[len(PREFIX) :]
        route = route_for(path)
        if route is None:
            return self.send(404, "<h1>Not Found</h1>", html=True)

        group = call_group(route)
        # The free reference lookups have a larger limit.
        limit = REFERENCE_RATE if group == "reference" else STATE["rate"]
        headers = self.rate_limited(group, limit)
        if headers is None:
            return None
        research = group == "research"
        if research and STATE["delay"]:
            time.sleep(STATE["delay"])
        if self.access_denied(route, headers):
            return None
        query = parse_qs(url.query)
        if errors := int_errors(query):
            return self.send(400, invalid_query(errors), headers)
        if research and self.research_gate(route, path, query, headers):
            return None
        return self.answer(route, path, query, headers)


def main():
    port = int(os.environ.get("MOCK_PORT", "8787"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Mock MarktMentor API on http://127.0.0.1:{port} (sample data, not live)")
    if STATE["no_premium"]:
        print("No paid Premium subscription: research gets HTTP 403")
    elif STATE["no_bundle"]:
        print(f"Free requests (no bundle): {STATE['remaining']} of {FREE_LIMIT} left")
    else:
        print(f"Fake bundle: {STATE['remaining']} research requests left")
    server.serve_forever()


if __name__ == "__main__":
    main()
