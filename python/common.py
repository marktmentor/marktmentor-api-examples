"""What the example scripts share, on top of the official SDK.

    pip install -r requirements.txt     # the SDK: pip install marktmentor

The SDK sends the requests, gives typed answers, follows the pages and retries
HTTP 408, 429 (it waits for Retry-After) and 5xx. It does not retry a 409. This
file adds what a script that spends research requests also needs:

- the key and the base URL from environment variables;
- a reserve: stop before the research allowance reaches MARKTMENTOR_RESERVE;
- a count of the research requests of this run, from the response headers;
- the error codes explained in plain words, with the X-Request-ID.

Environment variables:

    MARKTMENTOR_API_KEY       required: a live key (mm_live_...) or the
                              public test key mm_test_demo
    MARKTMENTOR_API_BASE_URL  optional, default https://api.marktmentor.nl
    MARKTMENTOR_RESERVE       optional, default 25: stop when the research
                              allowance has this many requests left
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Iterator, Optional

import httpx
from marktmentor import MarktMentor
from marktmentor.core.api_error import ApiError

MAX_RESULTS_PER_QUERY = 10_000

EXPLANATIONS = {
    "not_authenticated": "No key was sent. Set MARKTMENTOR_API_KEY.",
    "authentication_failed": (
        "The key is wrong, revoked, or its creator is no longer an "
        "administrator. Create a new key in Settings -> MarktMentor API."
    ),
    "api_terms_required": (
        "The owner or an administrator of the organization must accept the "
        "general terms in the dashboard: Settings -> MarktMentor API."
    ),
    "product_research_api_required": (
        "Research needs an API bundle or research access from MarktMentor. "
        "The store endpoints work without a bundle."
    ),
    "subscription_required": (
        "The API needs an active paid MarktMentor Premium subscription or "
        "higher (a trial does not count)."
    ),
    "insufficient_scope": "The credential does not have the necessary scope.",
    "store_not_connected": "Connect your bol store in the dashboard first.",
    "bundle_exhausted": "All requests of the API bundle are used for this period.",
    "overage_limit_reached": "The maximum for extra requests is reached.",
    "free_quota_exhausted": (
        "The 100 free research requests for this month are used. Choose an "
        "API bundle, or wait for the next calendar month."
    ),
    "ambiguous_ean": (
        "More than one product has this EAN. Use one of the product codes in "
        "'candidates'. A 409 does not count as a request."
    ),
    "bundle_payment_failed": (
        "The renewal payment of the API bundle failed. The organization owner "
        "updates the payment method in the dashboard. The bundle continues "
        "when the payment succeeds."
    ),
    "product_not_found": "No bol product has this EAN or product code.",
    "not_found": (
        "The product, niche or category does not exist. Check the code or the "
        "id. With the test key: only the example ids are known."
    ),
    "invalid_query": "A parameter is not valid. See 'errors' for the details.",
    "rate_limit_exceeded": (
        "Too many requests per minute. Wait for Retry-After, then try again."
    ),
    "research_unavailable": (
        "Research data is not available for a short time. Try again later. "
        "The request does not count."
    ),
    "billing_period_changed": (
        "A new billing period started during the request. Send the request "
        "again. It does not count."
    ),
    "store_unavailable": (
        "Store data is not available for a short time. Try again later."
    ),
    "reference_unavailable": (
        "Reference data is not available for a short time. Try again later."
    ),
    "api_unavailable": "The API is not available for a short time. Try again later.",
    "not_found_html": (
        "The path does not exist, the key is not valid, or the public API is "
        "not enabled for your organization yet. Check MARKTMENTOR_API_BASE_URL "
        "and ask MarktMentor to enable the API."
    ),
}


class AllowanceStop(Exception):
    """The script stops to protect the research allowance."""


def error_body(error: ApiError) -> dict:
    """The error body as a dict. The SDK gives a typed model or a dict."""
    body = error.body
    if hasattr(body, "model_dump"):
        return body.model_dump(by_alias=True, exclude_none=True)
    return body if isinstance(body, dict) else {}


def error_code(error: ApiError) -> str:
    """The `code` of an error answer, `not_found_html` for an HTML 404."""
    code = error_body(error).get("code")
    if code:
        return code
    return "not_found_html" if error.status_code == 404 else "request_failed"


def request_id(error: ApiError) -> Optional[str]:
    """The X-Request-ID of an error answer. Give it to support."""
    for name, value in (error.headers or {}).items():
        if name.lower() == "x-request-id":
            return value
    return None


def explain(error: ApiError) -> str:
    body = error_body(error)
    code = error_code(error)
    detail = body.get("detail") or ("" if body else str(error.body)[:200])
    message = f"HTTP {error.status_code} {code}: {detail}"
    if code in EXPLANATIONS:
        message += f"\n  -> {EXPLANATIONS[code]}"
    if body.get("errors"):
        message += f"\n  errors: {json.dumps(body['errors'])}"
    if request_id(error):
        message += f"\n  X-Request-ID: {request_id(error)} (give it to support)"
    return message


def _int(value: Optional[str]) -> Optional[int]:
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


def _reserve_from_env() -> int:
    """MARKTMENTOR_RESERVE as a whole number, 25 when it is not set or not valid."""
    raw = os.environ.get("MARKTMENTOR_RESERVE", "")
    if raw == "":
        return 25
    if raw.isdigit():
        return int(raw)
    print(
        f"Warning: MARKTMENTOR_RESERVE={raw} is not a whole number. Using 25.",
        file=sys.stderr,
    )
    return 25


def _is_research(url: httpx.URL) -> bool:
    return "/api/public/v1/research/" in url.path


def _sdk_retries(status: int) -> bool:
    """The statuses that the SDK sends again: 408, 429 and 5xx (not 409)."""
    return status in (408, 429) or status >= 500


@dataclass
class Allowance:
    """What the responses told us about the limits, and the reserve.

    Its two hooks run in the HTTP client of the SDK: `before` stops a research
    request at the reserve, `after` reads the limit headers of each answer.
    """

    reserve: int = 25
    max_retries: int = 3
    rate_limit: Optional[int] = None
    rate_remaining: Optional[int] = None
    research_limit: Optional[int] = None
    research_remaining: Optional[int] = None
    research_reset: Optional[str] = None
    research_requests_made: int = 0
    _retries: int = 0

    def before(self, request: httpx.Request) -> None:
        remaining = self.research_remaining
        if _is_research(request.url) and remaining is not None:
            if remaining <= self.reserve:
                raise AllowanceStop(
                    f"Stopped: {remaining} research requests left, the reserve "
                    f"is {self.reserve}. Set MARKTMENTOR_RESERVE to change it."
                )

    def after(self, response: httpx.Response) -> None:
        headers = response.headers
        for attribute, name in (
            ("rate_limit", "RateLimit-Limit"),
            ("rate_remaining", "RateLimit-Remaining"),
            ("research_limit", "X-Research-Requests-Limit"),
            ("research_remaining", "X-Research-Requests-Remaining"),
        ):
            value = _int(headers.get(name))
            if value is not None:
                setattr(self, attribute, value)
        if headers.get("X-Research-Requests-Reset"):
            self.research_reset = headers["X-Research-Requests-Reset"]
        if response.is_success and _is_research(response.request.url):
            self.research_requests_made += 1
        self._report_retry(response)

    def _report_retry(self, response: httpx.Response) -> None:
        """Say whether the SDK sends the request again (the scripts run one
        request at a time, so a count of the failed attempts is enough)."""
        status = response.status_code
        if not _sdk_retries(status):
            self._retries = 0
            return
        if self._retries >= self.max_retries:
            self._retries = 0
            print(f"HTTP {status}: no more retries.", file=sys.stderr)
            return
        self._retries += 1
        wait = response.headers.get("Retry-After")
        when = f"waits {wait} s and tries again" if wait else "tries again"
        print(
            f"HTTP {status}: the SDK {when} "
            f"(retry {self._retries} of {self.max_retries}).",
            file=sys.stderr,
        )

    def load(self, client: MarktMentor):
        """GET usage/ (free). Also sets the remaining research allowance."""
        usage = client.usage.get()
        if usage.plan == "bundle" and usage.bundle:
            self.research_limit = usage.bundle.included_requests
            self.research_remaining = usage.bundle.remaining_requests
            self.research_reset = str(usage.bundle.period_end)
        elif usage.plan == "free" and usage.free_tier:
            # The free requests count too: stop at the reserve here as well.
            self.research_limit = usage.free_tier.limit
            self.research_remaining = usage.free_tier.remaining
            self.research_reset = str(usage.free_tier.resets_at)
        return usage

    def summary(self) -> str:
        parts = [f"research requests made by this run: {self.research_requests_made}"]
        if self.research_remaining is not None:
            parts.append(
                f"allowance left: {self.research_remaining}/{self.research_limit}"
                f" (resets {self.research_reset})"
            )
        if self.rate_remaining is not None:
            parts.append(
                f"per-minute limit of the last call group: "
                f"{self.rate_remaining}/{self.rate_limit} left"
            )
        return ", ".join(parts)


def connect(reserve: Optional[int] = None) -> tuple[MarktMentor, Allowance]:
    """The SDK client with the key from the environment, and its Allowance."""
    if sys.version_info < (3, 10):
        # pip does not install the SDK on 3.9; this covers a run with another
        # Python than the one that installed it.
        raise SystemExit("These scripts need Python 3.10 or later.")
    key = os.environ.get("MARKTMENTOR_API_KEY", "")
    if not key:
        raise SystemExit(
            "Set MARKTMENTOR_API_KEY first, for example:\n"
            "  export MARKTMENTOR_API_KEY='mm_live_...'\n"
            "Create a key in the dashboard: Settings -> MarktMentor API."
        )
    if not key.startswith(("mm_live_", "mm_test_")):
        print(
            "Warning: an API key starts with mm_live_ (or mm_test_ for the test "
            "key). Check the value.",
            file=sys.stderr,
        )
    allowance = Allowance(reserve=_reserve_from_env() if reserve is None else reserve)
    http = httpx.Client(
        timeout=60,
        follow_redirects=True,
        event_hooks={"request": [allowance.before], "response": [allowance.after]},
    )
    client = MarktMentor(
        token=key,
        base_url=os.environ.get("MARKTMENTOR_API_BASE_URL") or None,
        httpx_client=http,
        max_retries=allowance.max_retries,
    )
    return client, allowance


def pages(pager, max_pages: Optional[int] = None) -> Iterator[Any]:
    """The pages of a list answer of the SDK. Stops at the last page, at
    max_pages, or at the depth limit of 10,000 results per query."""
    for page in pager.iter_pages():
        yield page.response
        pagination = page.response.pagination
        if not pagination.has_next:
            return
        if max_pages is not None and pagination.page >= max_pages:
            print(f"Stopped after {max_pages} page(s) (--max-pages).", file=sys.stderr)
            return
        if (pagination.page + 1) * pagination.page_size > MAX_RESULTS_PER_QUERY:
            print(
                "Stopped at the depth limit of 10,000 results. Use filters "
                "(category, brand, price) to reach other products.",
                file=sys.stderr,
            )
            return


CSV_ENCODING = "utf-8-sig"  # with a BOM, so that Excel reads the UTF-8 text


def call_text(name: str, **kwargs) -> str:
    """A planned SDK call as valid Python, for the dry-run output."""
    args = ", ".join(f"{key}={value!r}" for key, value in kwargs.items())
    return f"{name}({args})"


def as_dict(model) -> dict:
    """An SDK answer as a dict with the field names of the API (productCode)."""
    return model.model_dump(by_alias=True, mode="json")


def csv_safe(row: dict) -> dict:
    """A CSV row where text that starts with = + - @ tab or CR gets a ' first.

    A spreadsheet would run such a cell as a formula, and a product title is
    text from a marketplace. Numbers stay as they are; a whole number that
    the SDK gives as a float (120.0) is written as 120.
    """

    def cell(value):
        if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
            return f"'{value}"
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return value

    return {key: cell(value) for key, value in row.items()}


def run(main) -> None:
    """Run a script and print API errors without a traceback."""
    try:
        main()
    except ApiError as error:
        print(f"\n{explain(error)}", file=sys.stderr)
        sys.exit(1)
    except AllowanceStop as error:
        print(f"\n{error}", file=sys.stderr)
        sys.exit(1)
    except httpx.HTTPError as error:
        print(f"\nNo connection to the API: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
