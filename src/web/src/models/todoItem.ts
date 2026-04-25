export enum TodoItemState {
    Todo = "todo",
    InProgress = "inprogress",
    Done = "done"
}

export enum Priority {
    High = "high",
    Medium = "medium",
    Low = "low"
}

export interface Tag {
    id?: string;
    name: string;
    color: string;
    createdDate?: Date;
    updatedDate?: Date;
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
    priority?: Priority
    description?: string
    dueDate?: Date
    completedDate?:Date
    createdDate?: Date
    updatedDate?: Date
    subTasks?: SubTask[]
    tagIds?: string[]
}