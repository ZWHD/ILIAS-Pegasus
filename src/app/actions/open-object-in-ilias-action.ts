/** angular */
import {InjectionToken} from "@angular/core";
import {LoadingController, ModalController, Platform} from "@ionic/angular";
/** ionic-native */
import {InAppBrowser, InAppBrowserOptions} from "@ionic-native/in-app-browser/ngx";
/** logging */
import {Logger} from "../services/logging/logging.api";
import {Logging} from "../services/logging/logging.service";
/** misc */
import {ILIASObjectAction, ILIASObjectActionAlert, ILIASObjectActionResult, ILIASObjectActionNoMessage} from "./object-action";
import {Builder} from "../services/builder.base";
import {IllegalStateError} from "../error/errors";
import {LeaveAppAction, LeaveAppDialog, LeaveAppDialogNavParams} from "../fallback/open-browser/leave-app.dialog";
import { ɵangular_packages_platform_browser_platform_browser_k } from "@angular/platform-browser";


export class OpenObjectInILIASAction extends ILIASObjectAction {

    private readonly log: Logger = Logging.getLogger(OpenObjectInILIASAction.name);

    constructor(
        readonly title: string,
        private readonly target: Builder<Promise<string>>,
        private readonly browser: InAppBrowser,
        private readonly platform: Platform,
        private readonly modal: ModalController,
    ) { super() }

    async execute(): Promise<ILIASObjectActionResult> {
        const ilasLink: string = await this.target.build();

        if(this.platform.is("android"))   this.openUserDialog(() => this.openBrowserAndroid(ilasLink));
        else if(this.platform.is("ios"))
                // this.openUserDialog(() => this.openBrowserIos(ilasLink));
                this.openBrowserIos(ilasLink);
        else throw new IllegalStateError("Unsupported platform, unable to open browser for unsupported platform.");

        return new ILIASObjectActionNoMessage();
    }

    private openUserDialog(leaveAction: LeaveAppAction): void {
        this.log.debug(() => "Open leave app modal.");
        this.modal.create({
            component: LeaveAppDialog,
            componentProps: <LeaveAppDialogNavParams>{leaveApp: leaveAction},
            cssClass: "modal-fullscreen",
        }).then((it: HTMLIonModalElement) => it.present());
    }

    private openBrowserIos(link: string): void {
        this.log.trace(() => "Open ios browser (i nternal).");
        this.log.trace(() => `Navigate to url: ${link}`);
        var navColor =  window.getComputedStyle(document.documentElement).getPropertyValue('--in-app-browser-toolbar-background-color').trim();
        const options: InAppBrowserOptions = {
            location: "no",
            clearcache: "yes",
            clearsessioncache: "yes",
            usewkwebview: "yes",
            toolbarposition: "top",
            presentationstyle: "fullscreen",
            closebuttoncaption: "X",
            closebuttoncolor: "#FFFFFF",
            navigationbuttoncolor:"#FFFFFF",
            hidespinner: "no",
            toolbarcolor: navColor,
            toolbartranslucent: "no",
            suppressesIncrementalRendering:"yes"
        };


        //encode url or the browser will be stuck in a loading screen of death as soon as it reads the | character. (20.02.18)
        const browserobj = this.browser.create(encodeURI(link), "_blank", options);
    }

    private openBrowserAndroid(link: string): void {
        this.log.trace(() => "Open android browser (external).");
        this.log.trace(() => `Navigate to url: ${link}`);
        const options: InAppBrowserOptions = <InAppBrowserOptions>{
            location: "yes",
            clearcache: "yes",
            clearsessioncache: "yes",
            hideurlbar: "yes",
            toolbar: "yes",
            toolbarcolor: "#004D9F",
            navigationbuttoncolor: "#ffffff"
        };

        this.browser.create(encodeURI(link), "_system", options);
    }

    alert(): ILIASObjectActionAlert|undefined {
        return undefined;
    }
}

export const OPEN_OBJECT_IN_ILIAS_ACTION_FACTORY: InjectionToken<(title: string, urlBuilder: Builder<Promise<string>>) => OpenObjectInILIASAction> =
    new InjectionToken<(title: string, urlBuilder: Builder<Promise<string>>) => OpenObjectInILIASAction>("token for open in ILIAS action");
