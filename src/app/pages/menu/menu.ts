/* angular */
import {Component} from "@angular/core";
import { Cordova } from "@ionic-native/core";
import {NavController, Platform} from "@ionic/angular";
import { Logging } from "src/app/services/logging/logging.service";
/* misc */
import {AuthenticationProvider} from "../../providers/authentication.provider";
import {InAppBrowser, InAppBrowserObject, InAppBrowserOptions} from "@ionic-native/in-app-browser/ngx";


/**
 * Generated class for the MenuPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */
@Component({
    selector: "page-menu",
    templateUrl: "menu.html",
})
export class MenuPage {

    constructor(public navCtrl: NavController, private browser: InAppBrowser, private readonly auth: AuthenticationProvider, private readonly platform: Platform) {
    }

    async navigateTo(url: string): Promise<void> {
        await this.navCtrl.navigateForward(`tabs/menu/${url}`);
    }

    async logout(): Promise<void> {
        await this.auth.logout();
    }

    async openPrivacyPolicy(url: string): Promise<void> {
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
            suppressesIncrementalRendering:"yes",
            keyboardDisplayRequiresUserAction: "yes"
        }

        this.browser.create(url, this.platform.is("ios") ? "_blank" : "_system", options);

    }
}
