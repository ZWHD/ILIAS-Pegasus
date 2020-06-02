/** angular */
import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {Routes, RouterModule} from "@angular/router";
import {IonicModule} from "@ionic/angular";
/** misc */
import {NewsPage} from "./news";
import {TranslateModule} from "@ngx-translate/core";
import { StringPipe } from "src/app/pipes/string.pipe";

const routes: Routes = [
    {path: "", component: NewsPage}
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild(routes)
    ],
    declarations: [
        NewsPage,
        StringPipe
    ]
})
export class NewsPageModule {}
