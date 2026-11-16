"""Export your own store: performance, products and stock, to CSV files.

    python store_export.py
    python store_export.py --start 2026-10-01 --end 2026-10-31

Store requests are free and do not need an API bundle. They need the Pro plan
and a connected bol store. Limit: 60 store requests per minute.
"""

import argparse
import csv
import json

from marktmentor import MarktMentor, csv_safe, run

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
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(csv_safe(r) for r in rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--start", help="YYYY-MM-DD, with --end")
    parser.add_argument("--end", help="YYYY-MM-DD, included")
    parser.add_argument("--max-pages", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    period = (
        {"startDate": args.start, "endDate": args.end}
        if args.start and args.end
        else {"days": args.days}
    )
    api = MarktMentor()
    if args.dry_run:
        print("Dry run. Plan (0 research requests, store requests are free):")
        print(f"  GET {api.url('store/overview/', {'days': args.days})}")
        pages = f"(up to {args.max_pages} pages)"
        print(
            f"  GET {api.url('store/products/', {**period, 'pageSize': 100})} {pages}"
        )
        print(f"  GET {api.url('store/inventory/', {'pageSize': 100})} {pages}")
        return

    overview = api.get("store/overview/", {"days": args.days})
    print(
        f"Store {overview['period']['startDate']} .. {overview['period']['endDate']}:"
    )
    print(json.dumps(overview["kpis"], indent=2))

    products = []
    costs_hidden = False
    for body in api.pages(
        "store/products/", {**period, "pageSize": 100}, args.max_pages
    ):
        products.extend(body["data"])
        costs_hidden = body.get("costsVisible") is False
        if body["pagination"].get("totalMayBeCapped"):
            print("Note: the selection can be incomplete (totalMayBeCapped).")
    if costs_hidden:  # costsVisible is on store/products/
        print("Note: product and shipping costs are hidden for this store.")
    written = write("store-products.csv", PRODUCT_COLUMNS, products)
    print(f"store-products.csv: {written} products with orders")

    stock = []
    for body in api.pages("store/inventory/", {"pageSize": 100}, args.max_pages):
        stock.extend(body["data"])
    written = write("store-inventory.csv", STOCK_COLUMNS, stock)
    print(f"store-inventory.csv: {written} active products")
    print("\nThese calls did not use research requests.")


if __name__ == "__main__":
    run(main)
