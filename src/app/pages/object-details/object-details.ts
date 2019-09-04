/** angular */
import {Component, Inject, NgZone} from "@angular/core";
import {AlertController, ModalController, NavController, NavParams, ToastController} from "@ionic/angular";
/** ionic-native */
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
/** service */
import {Builder} from "../../services/builder.base";
import {FileService} from "../../services/file.service";
import {FooterToolbarService} from "../../services/footer-toolbar.service";
import {LINK_BUILDER, LinkBuilder} from "../../services/link/link-builder.service";
import {SynchronizationService} from "../../services/synchronization.service";
/** actions */
import {MarkAsFavoriteAction} from "../../actions/mark-as-favorite-action";
import {ILIASObjectAction, ILIASObjectActionResult, ILIASObjectActionSuccess} from "../../actions/object-action";
import {OpenFileExternalAction} from "../../actions/open-file-external-action";
import {OPEN_OBJECT_IN_ILIAS_ACTION_FACTORY, OpenObjectInILIASAction} from "../../actions/open-object-in-ilias-action";
import {RemoveLocalFileAction} from "../../actions/remove-local-file-action";
import {RemoveLocalFilesAction} from "../../actions/remove-local-files-action";
import {SynchronizeAction} from "../../actions/synchronize-action";
import {UnMarkAsFavoriteAction} from "../../actions/unmark-as-favorite-action";
/** logging */
import {Log} from "../../services/log.service";
import {Logger} from "../../services/logging/logging.api";
import {Logging} from "../../services/logging/logging.service";
/** misc */
import {ILIASObject} from "../../models/ilias-object";
import {DataProvider} from "../../providers/data-provider.provider";
import {TranslateService} from "@ngx-translate/core";
import {ObjectListPage} from "../object-list/object-list";

@Component({
    selector: "page-object-details",
    templateUrl: "object-details.html",
})
export class ObjectDetailsPage {

    object: ILIASObject = new ILIASObject();
    name: string = "ObjectDetailsPage";
    actions: Array<ILIASObjectAction>;
    /**
     * Holds the details of the current displayed ILIASObject
     */
    details: Array<{label: string, value: string}>;
    private readonly log: Logger = Logging.getLogger(this.name);

    constructor(public nav: NavController,
                public ngZone: NgZone,
                public dataProvider: DataProvider,
                public sync: SynchronizationService,
                public file: FileService,
                public alert: AlertController,
                public toast: ToastController,
                public translate: TranslateService,
                public footerToolbar: FooterToolbarService,
                public modal: ModalController,
                private readonly browser: InAppBrowser,
                @Inject(OPEN_OBJECT_IN_ILIAS_ACTION_FACTORY)
                private readonly openInIliasActionFactory: (title: string, urlBuilder: Builder<Promise<string>>) => OpenObjectInILIASAction,
                @Inject(LINK_BUILDER) private readonly linkBuilder: LinkBuilder) {
    }

    ionViewWillEnter(): void {
        this.object = ObjectListPage.getDetailsObject();
        this.loadAvailableActions();
        this.loadObjectDetails();
    }

    executeAction(action: ILIASObjectAction): void {
        if (action.alert()) {
            this.alert.create({
                header: action.alert().title,
                message: action.alert().subTitle,
                buttons: [
                    {
                        text: "Cancel",
                        role: "cancel",
                        handler: (): void => {
                            // alert.dismiss();
                        }
                    },
                    {
                        text: "Ok",
                        handler: (): void => {
                            this.executeAndHandleAction(action);
                        }
                    }
                ]
            }).then((it: HTMLIonAlertElement) => it.present());
        } else {
            this.executeAndHandleAction(action);
        }
    }

    private executeAndHandleAction(action: ILIASObjectAction): void {
        this.log.trace(() => "executeAndHandleAction");
        this.log.debug(() => `action: ${action}`);
        action.execute()
            .then(result => this.actionHandler(result))
            .catch((error) => {
                this.log.warn(() => `action gone wrong: ${error}`);
                this.loadAvailableActions();
                this.loadObjectDetails();
                throw error;
            });
    }

    private actionHandler(result: ILIASObjectActionResult): void {
        Log.write(this, "actionHandler");
        this.handleActionResult(result);
        this.loadAvailableActions();
        this.loadObjectDetails();
    }

    private handleActionResult(result: ILIASObjectActionResult): void {
        Log.write(this, "handleActionResult");
        if (!result) return;
        if (result instanceof ILIASObjectActionSuccess) {
            if (result.message) {
                this.toast.create({
                    message: result.message,
                    duration: 3000
                }).then((it: HTMLIonToastElement) => it.present);
            }
        }
    }

    private loadObjectDetails(): void {
        this.object.presenter.details().then(details => {
            Log.describe(this, "Details are displayed: ", details);
            this.details = details;
        });
    }

    private loadAvailableActions(): void {
        this.actions = [
            this.openInIliasActionFactory(this.translate.instant("actions.view_in_ilias"), this.linkBuilder.default().target(this.object.refId))
        ];

        if (!this.object.isFavorite) {
            this.actions.push(new MarkAsFavoriteAction(
                this.translate.instant("actions.mark_as_favorite"),
                this.object,
                this.sync)
            );
        } else {
            this.actions.push(new UnMarkAsFavoriteAction(
                this.translate.instant("actions.unmark_as_favorite"),
                this.object,
                this.file)
            );
            this.actions.push(new SynchronizeAction(
                this.translate.instant("actions.synchronize"),
                this.object,
                this.sync,
                this.modal,
                this.translate)
            );
        }

        if (this.object.type == "file") {
            this.file.existsFile(this.object).then(() => {
                this.actions.push(new OpenFileExternalAction(this.translate.instant("actions.open_in_external_app"), this.object, this.file));
            }, () => {
                Log.write(this, "No file available: Remove and Open are not available.");
            });
        }
    }

}
