import { RestService } from "./restService";
import { TodoItem, SubTask } from "../models";

export class ItemService extends RestService<TodoItem> {
  public constructor(baseUrl: string, baseRoute: string) {
    super(baseUrl, baseRoute);
  }

  public async createSubTask(
    itemId: string,
    subTask: { name: string; completed?: boolean },
  ): Promise<TodoItem> {
    const response = await this.client.request<TodoItem>({
      method: "POST",
      url: `${itemId}/subtasks`,
      data: subTask,
    });

    return response.data;
  }

  public async updateSubTask(
    itemId: string,
    subTaskId: string,
    subTask: { name?: string; completed?: boolean },
  ): Promise<TodoItem> {
    const response = await this.client.request<TodoItem>({
      method: "PUT",
      url: `${itemId}/subtasks/${subTaskId}`,
      data: subTask,
    });

    return response.data;
  }

  public async deleteSubTask(
    itemId: string,
    subTaskId: string,
  ): Promise<TodoItem> {
    const response = await this.client.request<TodoItem>({
      method: "DELETE",
      url: `${itemId}/subtasks/${subTaskId}`,
    });

    return response.data;
  }
}
