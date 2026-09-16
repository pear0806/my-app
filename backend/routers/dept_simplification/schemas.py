from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Optional


class PersonBase(BaseModel):
    name: str = Field(min_length=1, max_length=40)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("名字不可為空白")
        return cleaned


class PersonResponse(PersonBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SplitCreate(BaseModel):
    person_id: int
    amount: float = Field(gt=0)


class SplitResponse(SplitCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=80)
    total_amount: float = Field(gt=0)
    payer_id: int
    splits: List[SplitCreate] = Field(min_length=1)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        return value.strip()


class ExpenseResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    payer_id: int
    splits: List[SplitResponse]
    model_config = ConfigDict(from_attributes=True)


class SettlementResponse(BaseModel):
    from_person: str
    to_person: str
    from_id: int
    to_id: int
    amount: float


class BalanceResponse(BaseModel):
    person_id: int
    name: str
    amount: float


class OverviewResponse(BaseModel):
    persons: List[PersonResponse]
    expenses: List[ExpenseResponse]
    balances: List[BalanceResponse]
    settlements: List[SettlementResponse]
    original_edges: int
    simplified_count: int


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
