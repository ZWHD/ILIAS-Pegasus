import { PipeTransform, Pipe, SecurityContext } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
    name: 'toString'
})
export class StringPipe implements PipeTransform {

    constructor(
        private sanitizer: DomSanitizer
    ){}
    transform(value: any) : string {
        return this.sanitizer.sanitize(SecurityContext.HTML,value)
    }

}
