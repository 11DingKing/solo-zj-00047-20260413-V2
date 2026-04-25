from datetime import datetime
from http import HTTPStatus
from typing import List, Optional
from urllib.parse import urljoin

from beanie import PydanticObjectId
from fastapi import HTTPException, Response
from starlette.requests import Request

from .app import app
from .models import (CreateUpdateTodoItem, CreateUpdateTodoList,
                     CreateUpdateSubTask, SubTask, TodoItem, TodoList,
                     TodoState)

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
    item = TodoItem(listId=list_id, **body.dict(), createdDate=datetime.utcnow(), subTasks=[])
    response.headers["Location"] = urljoin(str(request.base_url), "lists/{0}/items/{1}".format(str(list_id), str(item.id)))
    return await item.save()


@app.get("/lists/{list_id}/items", response_model=List[TodoItem], response_model_by_alias=False)
async def get_list_items(
    list_id: PydanticObjectId,
    top: Optional[int] = None,
    skip: Optional[int] = None,
) -> List[TodoItem]:
    """
    Gets Todo items within the specified list

    Optional arguments:

    - **top**: Number of lists to return
    - **skip**: Number of lists to skip
    """
    query = TodoItem.find(TodoItem.listId == list_id).skip(skip).limit(top)
    return await query.to_list()


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
