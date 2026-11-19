"""Search products and write them to a CSV file, page by page.

    python products_to_csv.py drinkfles --max-pages 2
    python products_to_csv.py drinkfles --max-pages 4 --dry-run
    python products_to_csv.py --category-id 40142 --min-sales 100 --out bottles.csv

Each page is one research request. The script stops when there are no more
pages, at --max-pages, at the reserve (MARKTMENTOR_RESERVE) or on HTTP 402.
"""

import argparse
import csv

from common import CSV_ENCODING, as_dict, call_text, connect, csv_safe, pages, run

COLUMNS = [
    "productCode",
    "ean",
    "title",
    "brand",
    "rating",
    "reviewCount",
    "NL.price",
    "NL.sales",
    "NL.revenue",
    "BE.price",
    "BE.sales",
    "BE.revenue",
    "updatedAt",
]


def row(product: dict) -> dict:
    flat = {key: product.get(key) for key in COLUMNS if "." not in key}
    for market in ("NL", "BE"):
        metrics = (product.get("markets") or {}).get(market) or {}
        for metric in ("price", "sales", "revenue"):
            # Values are written unchanged; round only when you display them.
            flat[f"{market}.{metric}"] = metrics.get(metric)
    return flat


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("search", nargs="?", help="all words must match")
    parser.add_argument("--category-id", type=int)
    parser.add_argument("--brand", help="exact brand name")
    parser.add_argument("--min-sales", type=int)
    parser.add_argument("--period", default="30d", choices=["30d", "90d", "365d"])
    parser.add_argument("--sort", default=None, help="for example -sales")
    parser.add_argument("--page-size", type=int, default=25)
    parser.add_argument("--max-pages", type=int, default=2)
    parser.add_argument("--out", default="products.csv")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    client, allowance = connect()
    usage = allowance.load(client)  # free; tells us how much is left
    query = {
        "search": args.search,
        "category_id": args.category_id,
        "brand": args.brand,
        "min_sales": args.min_sales,
        "market": "ALL",
        "period": args.period,
        "sort": args.sort,
        "page_size": args.page_size,
    }
    query = {key: value for key, value in query.items() if value is not None}

    if args.dry_run:
        print(f"Dry run. Plan: {call_text('client.products.list', **query)}")
        print(f"At most {args.max_pages} research request(s), one per page.")
        print(f"Research plan: {usage.plan}; {allowance.summary()}")
        return

    count = 0
    with open(args.out, "w", newline="", encoding=CSV_ENCODING) as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for page in pages(client.products.list(**query), args.max_pages):
            for product in page.data:
                writer.writerow(csv_safe(row(as_dict(product))))
                count += 1
            total = page.pagination.total
            print(f"page {page.pagination.page}: {count} of {total} products")
    print(f"\nWrote {count} products to {args.out}")
    print(allowance.summary())


if __name__ == "__main__":
    run(main)
