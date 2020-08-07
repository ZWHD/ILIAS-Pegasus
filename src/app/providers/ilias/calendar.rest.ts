import { Time } from "@angular/common";
import { InjectionToken, Inject } from "@angular/core";
import { NewsRest } from "./news.rest";
import { ILIAS_REST, ILIASRest, ILIASRequestOptions } from "./ilias.rest";
import { HttpResponse } from "../http";

export interface CalendarEntry{
    readonly id: string,
    readonly milestone: boolean,
    readonly title: string,
    readonly description: string,
    readonly fullday: boolean,
    readonly begin: Date,
    readonly end: Date,
    readonly duration: Time,
    readonly last_update: Date,
    readonly frequence: string
}

export interface CalendarRest {
    getCalendarEntries(): Promise<Array<CalendarEntry>>
}


export const CALENDAR_REST: InjectionToken<NewsRest> = new InjectionToken("token for ILIAS calendar rest interface");


export class CalendarRestImpl implements CalendarRest{

    private readonly REST_PATH = "/v3/ilias-app/ical/events"

    constructor(
        @Inject(ILIAS_REST) private readonly rest: ILIASRest
    ){
    }

    async getCalendarEntries(): Promise<CalendarEntry[]> {

      const result: HttpResponse =  await this.rest.get(this.REST_PATH, <ILIASRequestOptions>{
            accept: "application/json",
          })

           return result.handle<CalendarEntry[]>(res => {
                return res.json<CalendarEntry[]>(this.rest)
            })
    }

    private schema: {} = [{
        "title": "CalendarEntries",
        "type": "object",
        "properties": {
            "id":{
                "description": "The ref id of the calendar context.",
                "type": "string",
            },
            "milestone":{
                "description": "",
                "type": "boolean",
            },
            "title":{
                "description": "",
                "type": "string",
            },
            "description":{
                "description": "",
                "type": "string",
            },
            "fullday":{
                "description": "",
                "type": "boolean",
            },
            "begin":{
                "description": "",
                "type": "integer",
                "minimum": 1
            },
            "end":{
                "description": "",
                "type": "integer",
                "minimum": 1
            },
            "duration":{
                "description": "",
                "type": "integer",
                "minimum": 1
            },
            "last_update":{
                "description": "",
                "type": "integer",
                "minimum": 1
            },
            "frequence":{
                "description": "",
                "type": "string"
            }
        }
    }]

}
