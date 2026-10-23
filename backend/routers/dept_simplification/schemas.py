from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# 金額一律是「分」的整數。上限約 1 億元，擋掉明顯的輸入錯誤。
MAX_CENTS = 10_000_000_000


def _clean_text(value: str, empty_message: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(empty_message)
    return cleaned


class TripCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _clean_text(value, "旅程名稱不可為空白")


class TripResponse(TripCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PersonBase(BaseModel):
    name: str = Field(min_length=1, max_length=40)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _clean_text(value, "名字不可為空白")


class PersonResponse(PersonBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SplitCreate(BaseModel):
    person_id: int
    amount_cents: int = Field(gt=0, le=MAX_CENTS)


class SplitResponse(SplitCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=80)
    total_cents: int = Field(gt=0, le=MAX_CENTS)
    payer_id: int
    splits: List[SplitCreate] = Field(min_length=1)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        return _clean_text(value, "用途不可為空白")


class ExpenseResponse(BaseModel):
    id: int
    description: str
    total_cents: int
    payer_id: int
    splits: List[SplitResponse]
    model_config = ConfigDict(from_attributes=True)


class SettlementResponse(BaseModel):
    from_person: str
    to_person: str
    from_id: int
    to_id: int
    amount_cents: int


class BalanceResponse(BaseModel):
    person_id: int
    name: str
    amount_cents: int


class OverviewResponse(BaseModel):
    trip: TripResponse
    persons: List[PersonResponse]
    expenses: List[ExpenseResponse]
    balances: List[BalanceResponse]
    settlements: List[SettlementResponse]
    original_edges: int
    simplified_count: int


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
