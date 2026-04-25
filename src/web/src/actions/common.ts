import * as itemActions from './itemActions';
import * as listActions from './listActions';
import * as tagActions from './tagActions';
import * as reminderActions from './reminderActions';

export enum ActionTypes {
    LOAD_TODO_LISTS = "LOAD_TODO_LISTS",
    LOAD_TODO_LIST = "LOAD_TODO_LIST",
    SELECT_TODO_LIST = "SELECT_TODO_LIST",
    SAVE_TODO_LIST = "SAVE_TODO_LIST",
    DELETE_TODO_LIST = "DELETE_TODO_LIST",
    LOAD_TODO_ITEMS = "LOAD_TODO_ITEMS",
    LOAD_TODO_ITEM = "LOAD_TODO_ITEM",
    SELECT_TODO_ITEM = "SELECT_TODO_ITEM",
    SAVE_TODO_ITEM = "SAVE_TODO_ITEM",
    DELETE_TODO_ITEM = "DELETE_TODO_ITEM",
    LOAD_TAGS = "LOAD_TAGS",
    SAVE_TAG = "SAVE_TAG",
    DELETE_TAG = "DELETE_TAG",
    SELECT_TAGS = "SELECT_TAGS",
    LOAD_DUE_REMINDERS = "LOAD_DUE_REMINDERS"
}

export type TodoActions =
    itemActions.ListItemsAction |
    itemActions.SelectItemAction |
    itemActions.LoadItemAction |
    itemActions.SaveItemAction |
    itemActions.DeleteItemAction |
    listActions.ListListsAction |
    listActions.SelectListAction |
    listActions.LoadListAction |
    listActions.SaveListAction |
    listActions.DeleteListAction |
    tagActions.LoadTagsAction |
    tagActions.SaveTagAction |
    tagActions.DeleteTagAction |
    tagActions.SelectTagsAction |
    reminderActions.LoadDueRemindersAction;