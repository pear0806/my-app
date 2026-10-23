BASE = "/api/dept"


def add_person(client, trip_id, name):
    res = client.post(f"{BASE}/trips/{trip_id}/persons/", json={"name": name})
    assert res.status_code == 200, res.text
    return res.json()


def ids_by_name(overview):
    return {p["name"]: p["id"] for p in overview["persons"]}


def expense(payer, splits, total=None, description="晚餐"):
    return {
        "description": description,
        "total_cents": total if total is not None else sum(splits.values()),
        "payer_id": payer,
        "splits": [{"person_id": pid, "amount_cents": c} for pid, c in splits.items()],
    }


def test_startup_creates_default_trip(client):
    trips = client.get(f"{BASE}/trips/").json()
    assert [t["name"] for t in trips] == ["預設旅程"]


def test_full_flow_returns_overview_after_each_change(client, trip_id):
    add_person(client, trip_id, "小明")
    ov = add_person(client, trip_id, "小華")
    ids = ids_by_name(ov)

    res = client.post(
        f"{BASE}/trips/{trip_id}/expenses/",
        json=expense(ids["小明"], {ids["小明"]: 50_000, ids["小華"]: 50_000}),
    )
    assert res.status_code == 200
    ov = res.json()

    assert ov["settlements"] == [
        {
            "from_id": ids["小華"],
            "to_id": ids["小明"],
            "from_person": "小華",
            "to_person": "小明",
            "amount_cents": 50_000,
        }
    ]
    assert {b["name"]: b["amount_cents"] for b in ov["balances"]} == {
        "小明": 50_000,
        "小華": -50_000,
    }
    assert (ov["original_edges"], ov["simplified_count"]) == (1, 1)

    ov = client.delete(f"{BASE}/trips/{trip_id}/expenses/{ov['expenses'][0]['id']}").json()
    assert ov["expenses"] == [] and ov["settlements"] == []


def test_splits_must_add_up_exactly(client, trip_id):
    ov = add_person(client, trip_id, "小明")
    ov = add_person(client, trip_id, "小華")
    ids = ids_by_name(ov)

    res = client.post(
        f"{BASE}/trips/{trip_id}/expenses/",
        json=expense(ids["小明"], {ids["小明"]: 500, ids["小華"]: 499}, total=1000),
    )
    assert res.status_code == 400
    assert "加總" in res.json()["detail"]


def test_rejects_float_money_and_bad_values(client, trip_id):
    ov = add_person(client, trip_id, "小明")
    pid = ids_by_name(ov)["小明"]
    base = expense(pid, {pid: 100})

    for bad in ({"total_cents": 10.5}, {"total_cents": 0}, {"total_cents": -5}):
        res = client.post(f"{BASE}/trips/{trip_id}/expenses/", json={**base, **bad})
        assert res.status_code == 422


def test_duplicate_name_only_conflicts_inside_the_same_trip(client, trip_id):
    add_person(client, trip_id, "小明")
    dup = client.post(f"{BASE}/trips/{trip_id}/persons/", json={"name": " 小明 "})
    assert dup.status_code == 409

    other = client.post(f"{BASE}/trips/", json={"name": "日本"}).json()["id"]
    assert client.post(f"{BASE}/trips/{other}/persons/", json={"name": "小明"}).status_code == 200


def test_trips_are_isolated_from_each_other(client, trip_id):
    other = client.post(f"{BASE}/trips/", json={"name": "日本"}).json()["id"]
    add_person(client, trip_id, "小明")

    assert client.get(f"{BASE}/trips/{other}/overview/").json()["persons"] == []


def test_cannot_touch_another_trips_person_or_expense(client, trip_id):
    other = client.post(f"{BASE}/trips/", json={"name": "日本"}).json()["id"]
    ov = add_person(client, trip_id, "小明")
    pid = ids_by_name(ov)["小明"]

    assert client.delete(f"{BASE}/trips/{other}/persons/{pid}").status_code == 404

    # 用別的旅程的成員來記帳，要被擋下
    res = client.post(f"{BASE}/trips/{other}/expenses/", json=expense(pid, {pid: 100}))
    assert res.status_code == 400


def test_person_with_expenses_cannot_be_deleted(client, trip_id):
    ov = add_person(client, trip_id, "小明")
    pid = ids_by_name(ov)["小明"]
    client.post(f"{BASE}/trips/{trip_id}/expenses/", json=expense(pid, {pid: 100}))

    res = client.delete(f"{BASE}/trips/{trip_id}/persons/{pid}")
    assert res.status_code == 400


def test_reset_clears_trip_but_keeps_it(client, trip_id):
    ov = add_person(client, trip_id, "小明")
    pid = ids_by_name(ov)["小明"]
    client.post(f"{BASE}/trips/{trip_id}/expenses/", json=expense(pid, {pid: 100}))

    ov = client.delete(f"{BASE}/trips/{trip_id}/data/").json()
    assert ov["persons"] == [] and ov["expenses"] == []
    assert ov["trip"]["id"] == trip_id


def test_delete_trip_removes_everything_in_it(client, trip_id):
    other = client.post(f"{BASE}/trips/", json={"name": "日本"}).json()["id"]
    ov = add_person(client, other, "小明")
    pid = ids_by_name(ov)["小明"]
    client.post(f"{BASE}/trips/{other}/expenses/", json=expense(pid, {pid: 100}))

    assert client.delete(f"{BASE}/trips/{other}").status_code == 200
    assert client.get(f"{BASE}/trips/{other}/overview/").status_code == 404
    assert [t["id"] for t in client.get(f"{BASE}/trips/").json()] == [trip_id]


def test_unknown_trip_is_404(client):
    assert client.get(f"{BASE}/trips/9999/overview/").status_code == 404
