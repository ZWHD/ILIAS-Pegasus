import {Component} from "@angular/core";
import {NavController} from "@ionic/angular";
import { Router } from "@angular/router";

@Component({
    selector: "app-tabs",
    templateUrl: "./tabs.page.html"
})
export class TabsPage {
    constructor(
        private router: Router,
        private readonly navCtrl: NavController
    ) {}

    // navigate to a tab
    async navigateTo(url: string): Promise<void> {
        await this.router.navigate([`tabs/${url}`])
        // await this.navCtrl.navigateForward(`tabs/${url}`);
    }
}
