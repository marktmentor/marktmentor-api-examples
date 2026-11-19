"""Export your own store: performance, products and stock, to CSV files.

    python store_export.py
    python store_export.py --start 2026-10-01 --end 2026-10-31

--start and --end set the period of the products. The overview endpoint
accepts only a number of days, so the overview covers the last --days days.

Store requests are free and do not need an API bundle. They need the Pro plan
and a connected bol store. Limit: 60 store requests per minute.
"""

import argparse
import csv
import datetime
import json

from common import (
    CSV_ENCODING,
    as_dict,
    call_text,
    connect,
    csv_safe,
    pages,
    run,
)

PRODUCT_COLUMNS = [
    "ean",
    "title",
    "sales",
    "orders",
    "returns",
    "revenue",
    "netRevenue",
    "totalCosts",
    "totalProfits",
    "totalMargin",
    "clicks",
    "conversion",
    "adCost",
    "acos",
    "tacos",
    "hasProductCosts",
]
STOCK_COLUMNS = [
    "ean",
    "title",
    "stock",
    "stockState",
    "source",
    "stockLastUpdated",
    "unknownReason",
]


def write(path, columns, rows) -> int:
    with open(path, "w", newline="", encoding=CSV_ENCODING) as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(csv_safe(r) for r in rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--days", type=int, default=30, help="the last N days (default 30)"
    )
    day = datetime.date.fromisoformat
    parser.add_argument(
        "--start", type=day, help="YYYY-MM-DD, with --end; for the products only"
    )
    parser.add_argument("--end", type=day, help="YYYY-MM-DD, included, with --start")
    parser.add_argument("--max-pages", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if bool(args.start) != bool(args.end):
        parser.error("give --start and --end together, or neither")
    period = (
        {"start_date": args.start, "end_date": args.end}
        if args.start
        else {"days": args.days}
    )
    # store/overview/ accepts only `days`, not a start and end date.
    overview_note = (
        f"The overview covers the last {args.days} days (--days): "
        "the overview endpoint has no start and end date."
        if args.start
        else None
    )
    if args.dry_run:
        print("Dry run. Plan (0 research requests, store requests are free):")
        pages_note = f"# up to {args.max_pages} pages"
        print(f"  {call_text('client.store.overview', days=args.days)}")
        if overview_note:
            print(f"  # {overview_note}")
        products_call = call_text("client.store.products", **period, page_size=100)
        print(f"  {products_call} {pages_note}")
        print(f"  {call_text('client.store.inventory', page_size=100)} {pages_note}")
        return

    client, _ = connect()
    overview = client.store.overview(days=args.days)
    print(f"Store {overview.period.start_date} .. {overview.period.end_date}:")
    if overview_note:
        print(overview_note)
        print(f"The products cover {args.start} .. {args.end}.")
    print(json.dumps(as_dict(overview.kpis), indent=2))

    products = []
    costs_hidden = False
    pager = client.store.products(**period, page_size=100)
    for page in pages(pager, args.max_pages):
        products.extend(as_dict(item) for item in page.data)
        costs_hidden = page.costs_visible is False
        if page.pagination.total_may_be_capped:
            print("Note: the selection can be incomplete (totalMayBeCapped).")
    if costs_hidden:  # costsVisible is on store/products/
        print("Note: product and shipping costs are hidden for this store.")
    written = write("store-products.csv", PRODUCT_COLUMNS, products)
    print(f"store-products.csv: {written} products with orders")

    stock = []
    for page in pages(client.store.inventory(page_size=100), args.max_pages):
        stock.extend(as_dict(item) for item in page.data)
    written = write("store-inventory.csv", STOCK_COLUMNS, stock)
    print(f"store-inventory.csv: {written} active products")
    print("\nThese calls did not use research requests.")


if __name__ == "__main__":
    run(main)
