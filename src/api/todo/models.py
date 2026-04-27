from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, BaseSettings, Field

try:
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient
    AZURE_KEYVAULT_AVAILABLE = True
except ImportError:
    AZURE_KEYVAULT_AVAILABLE = False

def keyvault_name_as_attr(name: str) -> str:
    return name.replace("-", "_").upper()


class Settings(BaseSettings):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Load secrets from keyvault
        if AZURE_KEYVAULT_AVAILABLE and self.AZURE_KEY_VAULT_ENDPOINT:
            credential = DefaultAzureCredential()
            keyvault_client = SecretClient(self.AZURE_KEY_VAULT_ENDPOINT, credential)
            for secret in keyvault_client.list_properties_of_secrets():
                setattr(
                    self,
                    keyvault_name_as_attr(secret.name),
                    keyvault_client.get_secret(secret.name).value,
                )

    AZURE_COSMOS_CONNECTION_STRING: str = ""
    AZURE_COSMOS_DATABASE_NAME: str = "Todo"
    AZURE_KEY_VAULT_ENDPOINT: Optional[str] = None
    APPLICATIONINSIGHTS_CONNECTION_STRING: Optional[str] = None
    APPLICATIONINSIGHTS_ROLENAME: Optional[str] = "API"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class TodoList(Document):
    name: str
    description: Optional[str] = None
    createdDate: Optional[datetime] = None
    updatedDate: Optional[datetime] = None


class CreateUpdateTodoList(BaseModel):
    name: str
    description: Optional[str] = None


class TodoState(Enum):
    TODO = "todo"
    INPROGRESS = "inprogress"
    DONE = "done"


class Priority(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Tag(Document):
    name: str
    color: str
    createdDate: Optional[datetime] = None
    updatedDate: Optional[datetime] = None


class CreateUpdateTag(BaseModel):
    name: str
    color: str


class SubTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    completed: bool = False
    createdDate: Optional[datetime] = None
    updatedDate: Optional[datetime] = None


class TodoItem(Document):
    listId: PydanticObjectId
    name: str
    description: Optional[str] = None
    state: Optional[TodoState] = None
    priority: Optional[Priority] = None
    dueDate: Optional[datetime] = None
    completedDate: Optional[datetime] = None
    createdDate: Optional[datetime] = None
    updatedDate: Optional[datetime] = None
    subTasks: List[SubTask] = []
    tagIds: List[PydanticObjectId] = []


class CreateUpdateTodoItem(BaseModel):
    name: str
    description: Optional[str] = None
    state: Optional[TodoState] = None
    priority: Optional[Priority] = None
    dueDate: Optional[datetime] = None
    completedDate: Optional[datetime] = None
    tagIds: Optional[List[PydanticObjectId]] = None


class CreateUpdateSubTask(BaseModel):
    name: str
    completed: Optional[bool] = None


__beanie_models__ = [TodoList, TodoItem, Tag]
