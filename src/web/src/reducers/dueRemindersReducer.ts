import { Reducer } from "react";
import { ActionTypes, TodoActions } from "../actions/common";
import { TodoItem } from "../models"

export const dueRemindersReducer: Reducer<TodoItem[], TodoActions> = (state: TodoItem[], action: TodoActions): TodoItem[] => {
    switch (action.type) {
        case ActionTypes.LOAD_DUE_REMINDERS:
            state = [...action.payload];
            break;
        case ActionTypes.SAVE_TODO_ITEM:
            const existingIndex = state.findIndex(item => item.id === action.payload.id);
            if (existingIndex > -1) {
                if (action.payload.state === "done" || !action.payload.dueDate) {
                    state = [...state.filter(item => item.id !== action.payload.id)];
                } else {
                    const newState = [...state];
                    newState.splice(existingIndex, 1, action.payload);
                    state = newState;
                }
            }
            break;
        case ActionTypes.DELETE_TODO_ITEM:
            state = [...state.filter(item => item.id !== action.payload)];
            break;
    }

    return state;
}