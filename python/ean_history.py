"""The sales history of one or more EANs, written to a CSV file.

    python ean_history.py 5407005143414
    python ean_history.py 5407005143414 8712345678906 --period 1Y --interval week

The product paths accept `ean:` and the 13-digit EAN in place of the product
code, so each EAN costs one research request. When more than one bol product
has the EAN, the API answers HTTP 409 with the candidate product codes and does
not choose. That 409 does not count. The script prints the candidates: run it
again with the product code you want (`--code`).
"""

import argparse
import csv

from marktmentor import ApiError, MarktMentor, csv_safe, run


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("eans", nargs="*")
    parser.add_argument(
        "--code",
        action="append",
        default=[],
        help="a bol product code, for an EAN that got HTTP 409",
    )
    parser.add_argument("--period", default="1Y", choices=["3M", "6M", "1Y", "2Y"])
    parser.add_argument("--interval", default="month", choices=["week", "month"])
    parser.add_argument("--out", default="sales-history.csv")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.period == "2Y" and args.interval != "month":
        parser.error(
            "use --interval month with --period 2Y (the API refuses week there)"
        )
    items = [("ean", ean) for ean in args.eans] + [("code", code) for code in args.code]
    if not items:
        parser.error("give one or more EANs, or --code")

    api = MarktMentor()
    usage = api.load_usage()
    if args.dry_run:
        print(f"Dry run: {len(items)} item(s) x 1 = {len(items)} research requests.")
        print(f"Research plan: {usage.get('plan')}; {api.usage.summary()}")
        return

    columns = ["ean", "productCode", "date", "market", "sales", "revenue", "price"]
    with open(args.out, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for kind, value in items:
            path = f"ean:{value}" if kind == "ean" else value
            try:
                history = api.get(
                    f"research/products/{path}/sales-history/",
                    {"market": "ALL", "period": args.period, "interval": args.interval},
                )
            except ApiError as error:
                if error.status == 409 and error.code == "ambiguous_ean":
                    print(
                        f"{value}: more than one product has this EAN "
                        "(not counted). Choose one:"
                    )
                    for candidate in (error.body or {}).get("candidates", []):
                        print(
                            f"  --code {candidate['productCode']}  "
                            f"{candidate.get('title')}"
                        )
                    continue
                if error.status == 404 and error.code in (
                    "product_not_found",
                    "not_found",
                ):
                    print(f"{value}: no product or no history found (not counted)")
                    continue
                raise
            for point in history["data"]:
                for market, metrics in (point.get("markets") or {}).items():
                    writer.writerow(
                        csv_safe(
                            {
                                "ean": value if kind == "ean" else "",
                                "productCode": value if kind == "code" else "",
                                "date": point["date"],
                                "market": market,
                                **{
                                    key: (metrics or {}).get(key)
                                    for key in ("sales", "revenue", "price")
                                },
                            }
                        )
                    )
            print(f"{value}: {len(history['data'])} points")
    print(f"\nWrote {args.out}")
    print(api.usage.summary())


if __name__ == "__main__":
    run(main)
