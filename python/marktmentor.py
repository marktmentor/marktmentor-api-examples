"""A small client for the MarktMentor Public API. Python 3.9+, standard library only.

Configuration comes from environment variables:

    MARKTMENTOR_API_KEY       required, starts with mm_live_
    MARKTMENTOR_API_BASE_URL  optional, default https://api.marktmentor.nl
    MARKTMENTOR_RESERVE       optional, default 25: stop when the research
                              allowance has this many requests left

The client:
- sends the key as a Bearer credential and keeps the trailing slash;
- reads the RateLimit-* and X-Research-Requests-* headers after each call;
- waits for Retry-After on HTTP 429 and retries a 503 a few times;
- stops on HTTP 402 and before the research allowance reaches the reserve;
- explains the error codes in plain words.
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Iterator

DEFAULT_BASE_URL = "https://api.marktmentor.nl"
API_PREFIX = "/api/public/v1/"
MAX_RESULTS_PER_QUERY = 10_000
USER_AGENT = "marktmentor-api-examples/1.0 (python)"

EXPLANATIONS = {
    "not_authenticated": "No key was sent. Set MARKTMENTOR_API_KEY.",
    "authentication_failed": (
        "The key is wrong, revoked, or its creator is no longer an "
        "administrator. Create a new key in Settings -> MarktMentor API."
    ),
    "api_terms_required": (
        "An administrator must accept the API terms in the dashboard: "
        "Settings -> MarktMentor API."
    ),
    "product_research_api_required": (
        "Research needs an API bundle or research access from MarktMentor. "
        "The store endpoints work without a bundle (Pro plan)."
    ),
    "subscription_required": (
        "Research needs an active paid MarktMentor Premium subscription or "
        "higher (a trial does not count). The store endpoints need Pro."
    ),
    "subscription_plan_required": "The store endpoints need the Pro plan or higher.",
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
    "product_not_found": "No bol product has this EAN or product code.",
    "invalid_query": "A parameter is not valid. See 'errors' for the details.",
    "rate_limit_exceeded": "Too many requests per minute.",
}


class ApiError(Exception):
    """An error answer of the API that a retry does not fix."""

    def __init__(self, status: int, code: str, detail: str, body: Any = None):
        self.status = status
        self.code = code
        self.detail = detail
        self.body = body
        hint = EXPLANATIONS.get(code, "")
        message = f"HTTP {status} {code}: {detail}"
        if hint:
            message += f"\n  -> {hint}"
        super().__init__(message)

    def with_hint(self, hint: str) -> "ApiError":
        self.args = (f"{self.args[0]}\n  -> {hint}",)
        return self


class AllowanceStop(Exception):
    """The script stops to protect the research allowance."""


@dataclass
class Usage:
    """What the last response told us about limits."""

    rate_limit: int | None = None
    rate_remaining: int | None = None
    rate_reset_seconds: int | None = None
    research_limit: int | None = None
    research_remaining: int | None = None
    research_reset: str | None = None
    research_requests_made: int = 0
    request_ids: list[str] = field(default_factory=list)

    def summary(self) -> str:
        parts = [f"research requests made by this run: {self.research_requests_made}"]
        if self.research_remaining is not None:
            parts.append(
                f"allowance left: {self.research_remaining}/{self.research_limit}"
                f" (resets {self.research_reset})"
            )
        if self.rate_remaining is not None:
            parts.append(f"rate limit left: {self.rate_remaining}/{self.rate_limit}")
        return ", ".join(parts)


def csv_safe(row: dict) -> dict:
    """A CSV row where text that starts with = + - @ gets a ' first.

    A spreadsheet would run such a cell as a formula, and a product title is
    text from a marketplace. Numbers stay as they are.
    """
    return {
        k: f"'{v}" if isinstance(v, str) and v[:1] in ("=", "+", "-", "@") else v
        for k, v in row.items()
    }


def _int_header(headers, name: str) -> int | None:
    value = headers.get(name)
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


class MarktMentor:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        reserve: int | None = None,
        max_retries: int = 3,
        verbose: bool = True,
    ):
        self.api_key = api_key or os.environ.get("MARKTMENTOR_API_KEY", "")
        if not self.api_key:
            raise SystemExit(
                "Set MARKTMENTOR_API_KEY first, for example:\n"
                "  export MARKTMENTOR_API_KEY='mm_live_...'\n"
                "Create a key in the dashboard: Settings -> MarktMentor API."
            )
        if not self.api_key.startswith("mm_live_"):
            print(
                "Warning: an API key starts with mm_live_. Check the value.",
                file=sys.stderr,
            )
        self.base_url = (
            base_url or os.environ.get("MARKTMENTOR_API_BASE_URL") or DEFAULT_BASE_URL
        ).rstrip("/")
        self.reserve = reserve if reserve is not None else _reserve_from_env()
        self.max_retries = max_retries
        self.verbose = verbose
        self.usage = Usage()

    # -- low level ---------------------------------------------------------

    def url(self, path: str, params: dict[str, Any] | None = None) -> str:
        path = path.lstrip("/")
        if not path.endswith("/"):
            path += "/"  # without the slash the API answers with a 301
        query = {
            key: ("true" if value is True else "false" if value is False else value)
            for key, value in (params or {}).items()
            if value is not None
        }
        url = f"{self.base_url}{API_PREFIX}{path}"
        if query:
            url += "?" + urllib.parse.urlencode(query)
        return url

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """GET one endpoint. Returns the parsed JSON body."""
        research = path.lstrip("/").startswith("research/")
        if research:
            self._check_reserve()
        url = self.url(path, params)
        attempt = 0
        while True:
            attempt += 1
            request = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                    "User-Agent": USER_AGENT,
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    self._read_headers(response.headers)
                    body = json.loads(response.read().decode("utf-8"))
                    if research:
                        self.usage.research_requests_made += 1
                    return body
            except urllib.error.HTTPError as error:
                self._read_headers(error.headers)
                status = error.code
                raw = error.read().decode("utf-8", errors="replace")
                if status == 429 and attempt <= self.max_retries:
                    wait = _int_header(error.headers, "Retry-After") or 60
                    self._log(f"HTTP 429: waiting {wait} s (Retry-After).")
                    time.sleep(wait)
                    continue
                if status == 503 and attempt <= self.max_retries:
                    wait = 5 * attempt
                    self._log(f"HTTP 503: retry in {wait} s.")
                    time.sleep(wait)
                    continue
                raise self._error(status, error.headers, raw) from None

    def _error(self, status: int, headers, raw: str) -> ApiError:
        content_type = headers.get("Content-Type", "")
        if "json" not in content_type:
            if status == 404:
                return ApiError(
                    404,
                    "not_found_html",
                    "The server answered with an HTML page.",
                    raw[:200],
                ).with_hint(
                    "The path does not exist, the key is not valid, or the public "
                    "API is not enabled "
                    "for your organization yet. Check MARKTMENTOR_API_BASE_URL "
                    "and ask MarktMentor to enable the API."
                )
            return ApiError(status, "unexpected_response", raw[:200])
        try:
            body = json.loads(raw)
        except ValueError:
            body = {}
        code = body.get("code", "request_failed") if isinstance(body, dict) else ""
        detail = body.get("detail", "") if isinstance(body, dict) else str(body)
        error = ApiError(status, code, detail, body)
        if isinstance(body, dict) and body.get("errors"):
            error.args = (f"{error.args[0]}\n  errors: {json.dumps(body['errors'])}",)
        return error

    def _read_headers(self, headers) -> None:
        usage = self.usage
        for attribute, name in (
            ("rate_limit", "RateLimit-Limit"),
            ("rate_remaining", "RateLimit-Remaining"),
            ("rate_reset_seconds", "RateLimit-Reset"),
            ("research_limit", "X-Research-Requests-Limit"),
            ("research_remaining", "X-Research-Requests-Remaining"),
        ):
            value = _int_header(headers, name)
            if value is not None:
                setattr(usage, attribute, value)
        if headers.get("X-Research-Requests-Reset"):
            usage.research_reset = headers.get("X-Research-Requests-Reset")
        if headers.get("X-Request-ID"):
            usage.request_ids.append(headers.get("X-Request-ID"))

    def _check_reserve(self) -> None:
        remaining = self.usage.research_remaining
        if remaining is not None and remaining <= self.reserve:
            raise AllowanceStop(
                f"Stopped: {remaining} research requests left, the reserve is "
                f"{self.reserve}. Set MARKTMENTOR_RESERVE to change it."
            )

    def _log(self, message: str) -> None:
        if self.verbose:
            print(message, file=sys.stderr)

    # -- helpers -----------------------------------------------------------

    def load_usage(self) -> dict:
        """GET /usage/ (free). Also primes the remaining research allowance."""
        usage = self.get("usage/")
        if usage.get("plan") == "bundle" and usage.get("bundle"):
            self.usage.research_limit = usage["bundle"]["includedRequests"]
            self.usage.research_remaining = usage["bundle"]["remainingRequests"]
            self.usage.research_reset = usage["bundle"]["periodEnd"]
        elif usage.get("plan") == "free" and usage.get("freeTier"):
            # The free requests count too: stop at the reserve here as well.
            self.usage.research_limit = usage["freeTier"]["limit"]
            self.usage.research_remaining = usage["freeTier"]["remaining"]
            self.usage.research_reset = usage["freeTier"]["resetsAt"]
        return usage

    def pages(
        self, path: str, params: dict[str, Any], max_pages: int | None = None
    ) -> Iterator[dict]:
        """Yield one response per page. Stops at hasNext=false, max_pages,
        or the depth limit of 10,000 results per query."""
        page_size = int(params.get("pageSize", 25))
        last_page = math.floor(MAX_RESULTS_PER_QUERY / page_size)
        page = int(params.get("page", 1))
        while True:
            body = self.get(path, {**params, "page": page, "pageSize": page_size})
            yield body
            pagination = body.get("pagination") or {}
            if not pagination.get("hasNext"):
                return
            if max_pages is not None and page >= max_pages:
                self._log(f"Stopped after {max_pages} page(s) (--max-pages).")
                return
            if page + 1 > last_page:
                self._log(
                    "Stopped at the depth limit of 10,000 results. Use filters "
                    "(category, brand, price) to reach other products."
                )
                return
            page += 1


def run(main) -> None:
    """Run a script and print API errors without a traceback."""
    try:
        main()
    except (ApiError, AllowanceStop) as error:
        print(f"\n{error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
