# Responsible gaming controls

This is a fictional-credit demo, not a real-money gambling product. The controls exist to demonstrate server-enforced product safeguards and are not a substitute for real-world support or regulatory tooling.

## Player controls

Players can configure:

- session reminders from 5 to 240 minutes;
- a daily VC wager limit, measured in UTC calendar days;
- a maximum wager up to the platform maximum;
- a 1-hour, 24-hour, or 7-day cool-off;
- a 1-day, 7-day, 30-day, or 365-day demo self-exclusion.

Cool-off and self-exclusion cannot be shortened or cancelled from the player interface. Active self-exclusion blocks gameplay server-side. Session reminders are informational and do not block access.

## Enforcement

Before a wager is debited, the gameplay transaction locks the player wallet, checks active restrictions, applies the lower of the platform max and player max, and sums the current UTC day’s `GAME_WAGER` debits. The wallet lock serializes concurrent wagers, so the daily limit cannot be bypassed by parallel requests. REST and PostgreSQL remain authoritative even if the browser loses realtime connectivity.

## Administration

The admin control room provides read-only inspection of configured limits and active pauses. It has no casual override action. Player changes are audited and create a notification so the player can see that the setting became active.
