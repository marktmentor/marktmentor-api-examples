"""Step 1: check the key, the organization and the allowance. Costs nothing.

python check.py
"""

from common import connect, run


def main() -> None:
    client, allowance = connect()
    for organization in client.organization.get():
        print(f"Organization: {organization.name} (id {organization.id})")

    usage = allowance.load(client)
    print(f"Research plan: {usage.plan}")
    if usage.plan == "bundle" and usage.bundle:
        bundle = usage.bundle
        print(
            f"  {bundle.remaining_requests} of {bundle.included_requests} "
            f"requests left until {bundle.period_end}"
        )
    elif usage.plan == "unmetered":
        print("  Research access without a metered bundle (a grant).")
    elif usage.plan == "free" and usage.free_tier:
        free = usage.free_tier
        print(
            f"  Free requests: {free.remaining} of {free.limit} left this month "
            f"(until {free.resets_at}), at most {free.page_size} results per "
            "page. Shared with the portal."
        )
    else:
        print(
            "  No research access. Research needs an active paid MarktMentor "
            "Premium subscription (100 free requests per month) or an API bundle. "
            "The store endpoints work without a bundle."
        )
    if allowance.rate_remaining is not None:
        # The limit counts per call group; usage/ is in the account group.
        print(
            "Per-minute limit of the account calls (organizations, usage): "
            f"{allowance.rate_remaining} of {allowance.rate_limit} left"
        )
    print("\nOK: the key works. These two calls did not use research requests.")


if __name__ == "__main__":
    run(main)
