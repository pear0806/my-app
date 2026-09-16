"""以分為單位計算淨額，並盡量減少轉帳次數。"""

from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
import heapq

CENT = Decimal("0.01")


def to_cents(value) -> int:
    quantized = Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)
    return int(quantized * 100)


def from_cents(cents: int) -> float:
    return float(Decimal(cents) / Decimal(100))


def even_split_cents(total_cents: int, n: int) -> list[int]:
    """把總額平分，餘數分給前面幾人，確保加總精確。"""
    if n <= 0:
        return []
    base, remainder = divmod(total_cents, n)
    return [base + (1 if i < remainder else 0) for i in range(n)]


def net_balances_cents(persons, expenses) -> dict[int, int]:
    balances = {person.id: 0 for person in persons}
    for expense in expenses:
        payer_id = expense.payer_id
        balances[payer_id] = balances.get(
            payer_id, 0) + to_cents(expense.total_amount)
        for split in expense.splits:
            pid = split.person_id
            balances[pid] = balances.get(pid, 0) - to_cents(split.amount)
    return balances


def _exact_amount_matches(
    debtors: dict[int, int], creditors: dict[int, int]
) -> list[tuple[int, int, int]]:
    """先配對金額完全相同的雙方，可少掉多餘轉帳。"""
    by_debt = defaultdict(list)
    by_credit = defaultdict(list)
    for pid, amt in debtors.items():
        by_debt[amt].append(pid)
    for pid, amt in creditors.items():
        by_credit[amt].append(pid)

    transfers = []
    for amount, debtor_ids in by_debt.items():
        creditor_ids = by_credit.get(amount, [])
        while debtor_ids and creditor_ids:
            did = debtor_ids.pop()
            cid = creditor_ids.pop()
            transfers.append((did, cid, amount))
            debtors.pop(did, None)
            creditors.pop(cid, None)
    return transfers


def _subset_clear(
    source: dict[int, int], targets: dict[int, int], source_pays: bool
) -> list[tuple[int, int, int]]:
    """若某人金額剛好等於對方若干人的總和，一次結清該人。"""
    transfers = []
    if not source or not targets or len(targets) > 16:
        return transfers

    changed = True
    while changed and source and targets:
        changed = False
        target_items = list(targets.items())
        sums = {0: 0}
        for i, (_, amt) in enumerate(target_items):
            bit = 1 << i
            new_sums = dict(sums)
            for mask, total in sums.items():
                new_sums[mask | bit] = total + amt
            sums = new_sums

        for sid, need in list(source.items()):
            match_mask = None
            for mask, total in sums.items():
                if mask and total == need:
                    match_mask = mask
                    break
            if match_mask is None:
                continue

            for i, (tid, amt) in enumerate(target_items):
                if match_mask & (1 << i):
                    if source_pays:
                        transfers.append((sid, tid, amt))
                    else:
                        transfers.append((tid, sid, amt))
                    targets.pop(tid, None)
            source.pop(sid, None)
            changed = True
            break

    return transfers


def simplify_transfers(balances_cents: dict[int, int]) -> list[tuple[int, int, int]]:
    """回傳 (from_id, to_id, cents)。"""
    debtors = {pid: -bal for pid, bal in balances_cents.items() if bal <= -1}
    creditors = {pid: bal for pid, bal in balances_cents.items() if bal >= 1}

    transfers = _exact_amount_matches(debtors, creditors)
    transfers.extend(_subset_clear(debtors, creditors, source_pays=True))
    transfers.extend(_subset_clear(creditors, debtors, source_pays=False))

    debtor_heap = [(-amt, pid) for pid, amt in debtors.items()]
    creditor_heap = [(-amt, pid) for pid, amt in creditors.items()]
    heapq.heapify(debtor_heap)
    heapq.heapify(creditor_heap)

    while debtor_heap and creditor_heap:
        debt_neg, debtor_id = heapq.heappop(debtor_heap)
        cred_neg, creditor_id = heapq.heappop(creditor_heap)
        debt_amt, cred_amt = -debt_neg, -cred_neg
        pay = min(debt_amt, cred_amt)
        transfers.append((debtor_id, creditor_id, pay))
        leftover_debt = debt_amt - pay
        leftover_cred = cred_amt - pay
        if leftover_debt >= 1:
            heapq.heappush(debtor_heap, (-leftover_debt, debtor_id))
        if leftover_cred >= 1:
            heapq.heappush(creditor_heap, (-leftover_cred, creditor_id))

    return transfers
