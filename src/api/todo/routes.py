from datetime import datetime
from http import HTTPStatus
from typing import List, Optional
from urllib.parse import urljoin

from beanie import PydanticObjectId
from fastapi import HTTPException, Response
from starlette.requests import Request

from .app import app
from .models import (CreateUpdateTag, CreateUpdateTodoItem,
                     CreateUpdateTodoList, CreateUpdateSubTask, Priority,
                     SubTask, Tag, TodoItem, TodoList, TodoState)

MAX_SUBTASKS = 10


def calculate_parent_state(item: TodoItem) -> TodoState:
    if not item.subTasks:
        return item.state or TodoState.TODO
    
    all_completed = all(st.completed for st in item.subTasks)
    any_incomplete = any(not st.completed for st in item.subTasks)
    
    if all_completed:
        return TodoState.DONE
    elif any_incomplete:
        return TodoState.INPROGRESS
    return TodoState.TODO


def update_parent_state_based_on_subtasks(item: TodoItem) -> None:
    if item.subTasks:
        item.state = calculate_parent_state(item)
        if item.state == TodoState.DONE:
            item.completedDate = datetime.utcnow()
        else:
            item.completedDate = None


@app.get("/lists", response_model=List[TodoList], response_model_by_alias=False)
async def get_lists(
    top: Optional[int] = None, skip: Optional[int] = None
) -> List[TodoList]:
    """
    Get all Todo lists

    Optional arguments:

    - **top**: Number of lists to return
    - **skip**: Number of lists to skip
    """
    query = TodoList.all().skip(skip).limit(top)
    return await query.to_list()


@app.post("/lists", response_model=TodoList, response_model_by_alias=False, status_code=201)
async def create_list(body: CreateUpdateTodoList, request: Request, response: Response) -> TodoList:
    """
    Create a new Todo list
    """
    todo_list = await TodoList(**body.dict(), createdDate=datetime.utcnow()).save()
    response.headers["Location"] = urljoin(str(request.base_url), "lists/{0}".format(str(todo_list.id)))
    return todo_list


@app.get("/lists/{list_id}", response_model=TodoList, response_model_by_alias=False)
async def get_list(list_id: PydanticObjectId) -> TodoList:
    """
    Get Todo list by ID
    """
    todo_list = await TodoList.get(document_id=list_id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    return todo_list


@app.put("/lists/{list_id}", response_model=TodoList, response_model_by_alias=False)
async def update_list(
    list_id: PydanticObjectId, body: CreateUpdateTodoList
) -> TodoList:
    """
    Updates a Todo list by unique identifier
    """
    todo_list = await TodoList.get(document_id=list_id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    await todo_list.update({"$set": body.dict(exclude_unset=True)})
    todo_list.updatedDate = datetime.utcnow()
    return await todo_list.save()


@app.delete("/lists/{list_id}", response_class=Response, status_code=204)
async def delete_list(list_id: PydanticObjectId) -> None:
    """
    Deletes a Todo list by unique identifier
    """
    todo_list = await TodoList.get(document_id=list_id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    await todo_list.delete()


@app.post("/lists/{list_id}/items", response_model=TodoItem, response_model_by_alias=False, status_code=201)
async def create_list_item(
    list_id: PydanticObjectId, body: CreateUpdateTodoItem, request: Request, response: Response
) -> TodoItem:
    """
    Creates a new Todo item within a list
    """
    item_data = body.dict(exclude_none=True)
    item = TodoItem(listId=list_id, **item_data, createdDate=datetime.utcnow(), subTasks=[])
    response.headers["Location"] = urljoin(str(request.base_url), "lists/{0}/items/{1}".format(str(list_id), str(item.id)))
    return await item.save()


def get_priority_order(priority: Optional[Priority]) -> int:
    if priority == Priority.HIGH:
        return 0
    elif priority == Priority.MEDIUM:
        return 1
    elif priority == Priority.LOW:
        return 2
    return 3


@app.get("/lists/{list_id}/items", response_model=List[TodoItem], response_model_by_alias=False)
async def get_list_items(
    list_id: PydanticObjectId,
    top: Optional[int] = None,
    skip: Optional[int] = None,
    tagIds: Optional[List[PydanticObjectId]] = None,
) -> List[TodoItem]:
    """
    Gets Todo items within the specified list

    Optional arguments:

    - **top**: Number of items to return
    - **skip**: Number of items to skip
    - **tagIds**: Filter by tag IDs (AND logic)
    """
    query = TodoItem.find(TodoItem.listId == list_id)
    
    if tagIds:
        for tag_id in tagIds:
            query = query.find(TodoItem.tagIds == tag_id)
    
    items = await query.to_list()
    
    items.sort(key=lambda x: get_priority_order(x.priority))
    
    if skip:
        items = items[skip:]
    if top:
        items = items[:top]
    
    return items


@app.get("/lists/{list_id}/items/state/{state}", response_model=List[TodoItem], response_model_by_alias=False)
async def get_list_items_by_state(
    list_id: PydanticObjectId,
    state: TodoState = ...,
    top: Optional[int] = None,
    skip: Optional[int] = None,
) -> List[TodoItem]:
    """
    Gets a list of Todo items of a specific state

    Optional arguments:

    - **top**: Number of lists to return
    - **skip**: Number of lists to skip
    """
    query = (
        TodoItem.find(TodoItem.listId == list_id, TodoItem.state == state)
        .skip(skip)
        .limit(top)
    )
    return await query.to_list()


@app.put("/lists/{list_id}/items/state/{state}", response_model=List[TodoItem], response_model_by_alias=False)
async def update_list_items_state(
    list_id: PydanticObjectId,
    state: TodoState = ...,
    body: List[str] = None,
) -> List[TodoItem]:
    """
    Changes the state of the specified list items
    """
    if not body:
        raise HTTPException(status_code=400, detail="No items specified")
    results = []    
    for id_ in body:
        item = await TodoItem.get(document_id=id_)
        if not item:
            raise HTTPException(status_code=404, detail="Todo item not found")
        item.state = state
        item.updatedDate = datetime.utcnow()
        results.append(await item.save())
    return results


@app.get("/lists/{list_id}/items/{item_id}", response_model=TodoItem, response_model_by_alias=False)
async def get_list_item(
    list_id: PydanticObjectId, item_id: PydanticObjectId
) -> TodoItem:
    """
    Gets a Todo item by unique identifier
    """
    item = await TodoItem.find_one(TodoItem.listId == list_id, TodoItem.id == item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    return item


@app.put("/lists/{list_id}/items/{item_id}", response_model=TodoItem, response_model_by_alias=False)
async def update_list_item(
    list_id: PydanticObjectId,
    item_id: PydanticObjectId,
    body: CreateUpdateTodoItem,
) -> TodoItem:
    """
    Updates a Todo item by unique identifier
    """
    item = await TodoItem.find_one(TodoItem.listId == list_id, TodoItem.id == item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    
    update_data = body.dict(exclude_unset=True)
    
    if item.subTasks and "state" in update_data:
        new_state = update_data["state"]
        if new_state == TodoState.DONE:
            all_completed = all(st.completed for st in item.subTasks)
            if not all_completed:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot mark parent as done when there are incomplete subtasks"
                )
    
    for key, value in update_data.items():
        setattr(item, key, value)
    
    item.updatedDate = datetime.utcnow()
    return await item.save()


@app.delete("/lists/{list_id}/items/{item_id}", response_class=Response, status_code=204)
async def delete_list_item(
    list_id: PydanticObjectId, item_id: PydanticObjectId
) -> None:
    """
    Deletes a Todo item by unique identifier
    """
    todo_item = await TodoItem.find_one(TodoItem.id == item_id)
    if not todo_item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    await todo_item.delete()


@app.post("/lists/{list_id}/items/{item_id}/subtasks", response_model=TodoItem, response_model_by_alias=False, status_code=201)
async def create_subtask(
    list_id: PydanticObjectId,
    item_id: PydanticObjectId,
    body: CreateUpdateSubTask,
) -> TodoItem:
    """
    Creates a new subtask within a todo item
    """
    item = await TodoItem.find_one(TodoItem.listId == list_id, TodoItem.id == item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    
    if len(item.subTasks) >= MAX_SUBTASKS:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum {MAX_SUBTASKS} subtasks allowed per todo item"
        )
    
    subtask = SubTask(
        name=body.name,
        completed=body.completed or False,
        createdDate=datetime.utcnow()
    )
    item.subTasks.append(subtask)
    update_parent_state_based_on_subtasks(item)
    item.updatedDate = datetime.utcnow()
    return await item.save()


@app.put("/lists/{list_id}/items/{item_id}/subtasks/{subtask_id}", response_model=TodoItem, response_model_by_alias=False)
async def update_subtask(
    list_id: PydanticObjectId,
    item_id: PydanticObjectId,
    subtask_id: str,
    body: CreateUpdateSubTask,
) -> TodoItem:
    """
    Updates a subtask within a todo item
    """
    item = await TodoItem.find_one(TodoItem.listId == list_id, TodoItem.id == item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    
    subtask_index = next((i for i, st in enumerate(item.subTasks) if st.id == subtask_id), None)
    if subtask_index is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    update_data = body.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item.subTasks[subtask_index], key, value)
    
    item.subTasks[subtask_index].updatedDate = datetime.utcnow()
    update_parent_state_based_on_subtasks(item)
    item.updatedDate = datetime.utcnow()
    return await item.save()


@app.delete("/lists/{list_id}/items/{item_id}/subtasks/{subtask_id}", response_model=TodoItem, response_model_by_alias=False)
async def delete_subtask(
    list_id: PydanticObjectId,
    item_id: PydanticObjectId,
    subtask_id: str,
) -> TodoItem:
    """
    Deletes a subtask from a todo item
    """
    item = await TodoItem.find_one(TodoItem.listId == list_id, TodoItem.id == item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")
    
    subtask_index = next((i for i, st in enumerate(item.subTasks) if st.id == subtask_id), None)
    if subtask_index is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    item.subTasks.pop(subtask_index)
    update_parent_state_based_on_subtasks(item)
    item.updatedDate = datetime.utcnow()
    return await item.save()


@app.get("/tags", response_model=List[Tag], response_model_by_alias=False)
async def get_tags(
    top: Optional[int] = None, skip: Optional[int] = None
) -> List[Tag]:
    """
    Get all tags
    """
    query = Tag.all().skip(skip).limit(top)
    return await query.to_list()


@app.post("/tags", response_model=Tag, response_model_by_alias=False, status_code=201)
async def create_tag(body: CreateUpdateTag, request: Request, response: Response) -> Tag:
    """
    Create a new tag
    """
    tag = await Tag(**body.dict(), createdDate=datetime.utcnow()).save()
    response.headers["Location"] = urljoin(str(request.base_url), "tags/{0}".format(str(tag.id)))
    return tag


@app.get("/tags/{tag_id}", response_model=Tag, response_model_by_alias=False)
async def get_tag(tag_id: PydanticObjectId) -> Tag:
    """
    Get tag by ID
    """
    tag = await Tag.get(document_id=tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@app.put("/tags/{tag_id}", response_model=Tag, response_model_by_alias=False)
async def update_tag(
    tag_id: PydanticObjectId, body: CreateUpdateTag
) -> Tag:
    """
    Updates a tag by unique identifier
    """
    tag = await Tag.get(document_id=tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await tag.update({"$set": body.dict(exclude_unset=True)})
    tag.updatedDate = datetime.utcnow()
    return await tag.save()


@app.delete("/tags/{tag_id}", response_class=Response, status_code=204)
async def delete_tag(tag_id: PydanticObjectId) -> None:
    """
    Deletes a tag by unique identifier and removes it from all todo items
    """
    tag = await Tag.get(document_id=tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    items_with_tag = await TodoItem.find(TodoItem.tagIds == tag_id).to_list()
    for item in items_with_tag:
        item.tagIds = [tid for tid in item.tagIds if tid != tag_id]
        item.updatedDate = datetime.utcnow()
        await item.save()
    
    await tag.delete()


@app.get("/items/reminders/due", response_model=List[TodoItem], response_model_by_alias=False)
async def get_due_reminders() -> List[TodoItem]:
    """
    Get todo items that are due today or overdue and not completed
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    today_end = datetime(now.year, now.month, now.day, 23, 59, 59)
    
    overdue_items = await TodoItem.find(
        TodoItem.state != TodoState.DONE,
        TodoItem.dueDate < today_start
    ).to_list()
    
    today_due_items = await TodoItem.find(
        TodoItem.state != TodoState.DONE,
        TodoItem.dueDate >= today_start,
        TodoItem.dueDate <= today_end
    ).to_list()
    
    all_items = overdue_items + today_due_items
    all_items.sort(key=lambda x: get_priority_order(x.priority))
    
    return all_items
