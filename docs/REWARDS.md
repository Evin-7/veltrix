# Rewards and progression

Veltrix progression is a fictional product-system demonstration. VC is not money, and XP is not convertible to VC or any external value.

## XP and VIP

Completed server-settled gameplay creates one `XpEvent` keyed to the game round. XP is derived from the settled wager (`max(1, floor(wager / 10))`); the browser cannot submit or modify it. `PlayerProgression` stores the current XP and VIP level.

VIP thresholds and milestone VC rewards are stored in `VipLevelConfig` for Bronze, Silver, Gold, Platinum, and Diamond. A progression row is locked while it is updated. Each crossed milestone uses a unique source key, so retries and concurrent requests cannot pay the same milestone twice.

## Reward history

`RewardHistory` records daily rewards, promotion rewards, and VIP milestones with a unique source key and optional wallet transaction link. The history is append-only from the product API. Wallet changes still go through the existing locked append-only ledger.

## Operations

Admins can read reward history. `SUPER_ADMIN` can edit thresholds and milestone amounts; edits are validated for ascending thresholds and written to the audit log. There are no cash rewards, purchases, transfers, withdrawals, or cash-out flows.
