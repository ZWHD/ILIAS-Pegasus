import { Time } from "@angular/common";
import { InjectionToken, Inject, Injectable } from "@angular/core";
import { NewsRest } from "./news.rest";
import { ILIAS_REST, ILIASRest, ILIASRequestOptions, ILIASTokenManager } from "./ilias.rest";
import { HttpResponse } from "../http";
import { Logger } from "src/app/services/logging/logging.api";
import { Logging } from "src/app/services/logging/logging.service";


export interface IliasCalendar {
    readonly calendar_id: string,
    readonly calendar_type: string,
    readonly calendar_title: string,
    readonly calendar_color: string,
    readonly events: CalendarEntry[]
}

export interface CalendarEntry {
    readonly event_id: string,
    readonly event_title: string,
    readonly event_subtitle: string,
    readonly event_location: string,
    readonly event_description: string,
    readonly event_beginDate: number,
    readonly event_endDate: number,
    readonly event_duration: number,
    readonly event_updated: number,
    readonly event_frequence: string
}

export interface CalendarRest {
    getCalendarEntries(): Promise<IliasCalendar[]>
}


export const CALENDAR_REST: InjectionToken<NewsRest> = new InjectionToken("token for ILIAS calendar rest interface");

@Injectable({
    providedIn: 'root'
})
export class CalendarRestImpl implements CalendarRest {

    private readonly REST_PATH = "/v3/ilias-app/ical/events"

    constructor(
        @Inject(ILIAS_REST) private readonly rest: ILIASRest
    ) {
    }

    async getCalendarEntries(): Promise<IliasCalendar[]> {

        const result: HttpResponse = await this.rest.get(this.REST_PATH, <ILIASRequestOptions>{
            accept: "application/json",
        })

        return result.handle<IliasCalendar[]>(res => {
            return res.json<IliasCalendar[]>(this.calendarSchema)
        })
    }

    private calendarSchema: {} = [{
        "type": "object",
        "properties": {
            "calendar_id": {
                "description": "",
                "type": "string",
            },
            "calendar_type": {
                "description": "",
                "type": "string",
            },
            "calendar_title": {
                "description": "",
                "type": "string",
            },
            "calendar_color": {
                "description": "",
                "type": "string",
            },
            "events": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "description": "",
                            "type": "string",
                        },
                        "event_title": {
                            "description": "",
                            "type": "string",
                        },
                        "event_subtitle": {
                            "description": "",
                            "type": "string",
                        },
                        "event_location": {
                            "description": "",
                            "type": "string",
                        },
                        "event_description": {
                            "description": "",
                            "type": "string",
                        },
                        "event_beginDate": {
                            "description": "",
                            "type": "integer",
                            "minimum": 1
                        },
                        "event_endDate": {
                            "description": "",
                            "type": "integer",
                            "minimum": 1
                        },
                        "event_duration": {
                            "description": "",
                            "type": "integer",
                            "minimum": 1
                        },
                        "event_last_update": {
                            "description": "",
                            "type": "integer",
                            "minimum": 1
                        },
                        "event_frequence": {
                            "description": "",
                            "type": "string"
                        }
                    }
                }
            }
        }
    }]
}
