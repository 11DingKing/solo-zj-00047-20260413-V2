import { RestService } from './restService';
import { Tag } from '../models';

export class TagService extends RestService<Tag> {
    public constructor(baseUrl: string, baseRoute: string) {
        super(baseUrl, baseRoute);
    }
}