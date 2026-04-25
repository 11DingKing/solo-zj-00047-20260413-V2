import { Dispatch } from "react";
import { TodoActions } from "../actions/common";
import { TodoItem, Tag } from "./todoItem";
import { TodoList } from "./todoList";

export interface AppContext {
    state: ApplicationState
    dispatch: Dispatch<TodoActions>
}

export interface ApplicationState {
    lists?: TodoList[]
    selectedList?: TodoList
    selectedItem?: TodoItem
    tags?: Tag[]
    selectedTagIds?: string[]
    dueReminders?: TodoItem[]
}

export const getDefaultState = (): ApplicationState => {
    return {
        lists: undefined,
        selectedList: undefined,
        selectedItem: undefined,
        tags: undefined,
        selectedTagIds: [],
        dueReminders: undefined
    }
}

