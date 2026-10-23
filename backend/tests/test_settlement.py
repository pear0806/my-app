import random

from routers.dept_simplification.settlement import simplify_transfers


def apply_transfers(balances, transfers):
    """把轉帳套用回淨額，結清後每個人都應該是 0。"""
    result = dict(balances)
    for from_id, to_id, cents in transfers:
        result[from_id] += cents
        result[to_id] -= cents
    return result


def test_empty_and_zero_balances_need_no_transfer():
    assert simplify_transfers({}) == []
    assert simplify_transfers({1: 0, 2: 0}) == []


def test_single_debt():
    assert simplify_transfers({1: -500, 2: 500}) == [(1, 2, 500)]


def test_chain_collapses_to_one_transfer():
    # A 欠 B 100、B 欠 C 100  ->  淨額 A=-100, B=0, C=+100
    assert simplify_transfers({1: -100, 2: 0, 3: 100}) == [(1, 3, 100)]


def test_one_person_clears_several_creditors_exactly():
    transfers = simplify_transfers({1: -300, 2: 100, 3: 200})
    assert sorted(transfers) == [(1, 2, 100), (1, 3, 200)]


def test_random_balances_always_settle_to_zero():
    rng = random.Random(20261023)
    for _ in range(300):
        n = rng.randint(2, 10)
        amounts = [rng.randint(-50_000, 50_000) for _ in range(n - 1)]
        amounts.append(-sum(amounts))  # 總和必須為 0
        balances = {i + 1: a for i, a in enumerate(amounts)}

        transfers = simplify_transfers(balances)

        assert all(cents > 0 for _, _, cents in transfers)
        assert all(a != b for a, b, _ in transfers)
        assert set(apply_transfers(balances, transfers).values()) <= {0}
        # 淨額非零的人數是上限：最多 (非零人數 - 1) 筆就能結清
        nonzero = sum(1 for a in balances.values() if a != 0)
        assert len(transfers) <= max(nonzero - 1, 0)
