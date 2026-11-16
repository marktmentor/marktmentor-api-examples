"""Step 1: check the key, the organization and the allowance. Costs nothing.

python check.py
"""

from marktmentor import MarktMentor, run


def main() -> None:
    api = MarktMentor()
    print(f"API: {api.base_url}")
    organizations = api.get("organizations/")
    for organization in organizations:
        print(f"Organization: {organization['name']} (id {organization['id']})")

    usage = api.load_usage()
    plan = usage.get("plan")
    print(f"Research plan: {plan}")
    if plan == "bundle":
        bundle = usage["bundle"]
        print(
            f"  {bundle['remainingRequests']} of {bundle['includedRequests']} "
            f"requests left until {bundle['periodEnd']}"
        )
    elif plan == "unmetered":
        print("  Research access without a metered bundle (a grant).")
    elif plan == "free":
        free = usage.get("freeTier") or {}
        print(
            f"  Free requests: {free.get('remaining')} of {free.get('limit')} left "
            f"this month (until {free.get('resetsAt')}), at most "
            f"{free.get('pageSize')} results per page. Shared with the portal."
        )
    else:
        print(
            "  No research access. Research needs an active paid MarktMentor "
            "Premium subscription (100 free requests per month) or an API bundle. "
            "The store endpoints work with the Pro plan."
        )
    print(
        f"Rate limit: {api.usage.rate_remaining}/{api.usage.rate_limit} "
        "requests left this minute"
    )
    print("\nOK: the key works. These two calls did not use research requests.")


if __name__ == "__main__":
    run(main)
