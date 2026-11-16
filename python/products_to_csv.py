"""Search products and write them to a CSV file, page by page.

    python products_to_csv.py drinkfles --max-pages 2
    python products_to_csv.py drinkfles --max-pages 4 --dry-run
    python products_to_csv.py --category-id 40142 --min-sales 100 --out bottles.csv

Each page is one research request. The script stops when there are no more
pages, at --max-pages, at the reserve (MARKTMENTOR_RESERVE) or on HTTP 402.
"""

import argparse
import csv

from marktmentor import MarktMentor, csv_safe, run

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

    api = MarktMentor()
    usage = api.load_usage()  # free; tells us how much is left
    params = {
        "search": args.search,
        "categoryId": args.category_id,
        "brand": args.brand,
        "minSales": args.min_sales,
        "market": "ALL",
        "period": args.period,
        "sort": args.sort,
        "pageSize": args.page_size,
    }

    if args.dry_run:
        print(f"Dry run. Plan: GET {api.url('research/products/', params)}")
        print(f"At most {args.max_pages} research request(s), one per page.")
        print(f"Research plan: {usage.get('plan')}; {api.usage.summary()}")
        return

    count = 0
    with open(args.out, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for body in api.pages("research/products/", params, args.max_pages):
            for product in body["data"]:
                writer.writerow(csv_safe(row(product)))
                count += 1
            total = body["pagination"]["total"]
            print(f"page {body['pagination']['page']}: {count} of {total} products")
    print(f"\nWrote {count} products to {args.out}")
    print(api.usage.summary())


if __name__ == "__main__":
    run(main)
