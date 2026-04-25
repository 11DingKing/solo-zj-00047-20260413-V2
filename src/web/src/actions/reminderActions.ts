import { Dispatch } from "react";
import { TodoItem } from "../models";
import { ItemService } from "../services/itemService";
import { ActionTypes } from "./common";
import config from "../config"
import { ActionMethod, createPayloadAction, PayloadAction } from "./actionCreators";

export interface ReminderActions {
    loadDueReminders(): Promise<TodoItem[]>
}

export const loadDueReminders = (): ActionMethod<TodoItem[]> => async (dispatch: Dispatch<LoadDueRemindersAction>) => {
    const itemService = new ItemService(config.api.baseUrl, '/items/reminders');
    const response = await itemService.client.request<TodoItem[]>({
        method: 'GET',
        url: 'due'
    });
    const items = response.data;

    dispatch(loadDueRemindersAction(items));

    return items;
}

export interface LoadDueRemindersAction extends PayloadAction<string, TodoItem[]> {
    type: ActionTypes.LOAD_DUE_REMINDERS
}

const loadDueRemindersAction = createPayloadAction<LoadDueRemindersAction>(ActionTypes.LOAD_DUE_REMINDERS);