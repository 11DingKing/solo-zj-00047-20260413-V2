export enum TodoItemState {
    Todo = "todo",
    InProgress = "inprogress",
    Done = "done"
}

export interface SubTask {
    id: string;
    name: string;
    completed: boolean;
    createdDate?: Date;
    updatedDate?: Date;
}

export interface TodoItem {
    id?: string
    listId: string
    name: string
    state: TodoItemState
    description?: string
    dueDate?: Date
    completedDate?:Date
    createdDate?: Date
    updatedDate?: Date
    subTasks?: SubTask[]
}