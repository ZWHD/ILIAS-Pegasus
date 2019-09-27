/** angular */
import {NavController} from "@ionic/angular";
/** misc */
import {ILIASObject} from "../models/ilias-object";
import {ILIASObjectAction, ILIASObjectActionAlert, ILIASObjectActionNoMessage, ILIASObjectActionResult} from "./object-action";
import {ObjectListPage} from "../pages/object-list/object-list";

export class ShowDetailsPageAction extends ILIASObjectAction {

    constructor(public title: string, public object: ILIASObject, public nav: NavController) {
        super();
    }

    execute(): Promise<ILIASObjectActionResult> {
        return new Promise((resolve, reject) => {
            ObjectListPage.setNavDetailsObject(this.object);
            const tab: string = ObjectListPage.nav.favorites ? "favorites" : "content";
            this.nav.navigateForward(`tabs/${tab}/details`).then(() => {
                resolve(new ILIASObjectActionNoMessage());
            }).catch(error => {
                reject(error);
            });
        });
    }

    alert(): ILIASObjectActionAlert|any {
        return undefined;
    }
}
