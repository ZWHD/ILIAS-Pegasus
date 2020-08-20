import { CalendarRest, CALENDAR_REST, CalendarEntry, IliasCalendar } from "src/app/providers/ilias/calendar.rest";
import { AlertController, Platform } from "@ionic/angular";
import { Inject, InjectionToken, Injectable } from "@angular/core";
import { Calendar, CalendarOptions } from '@ionic-native/calendar/ngx';
import { Logger } from "../logging/logging.api";
import { Logging } from "../logging/logging.service";
import { ILIASTokenManager } from "src/app/providers/ilias/ilias.rest";
import { stringify } from "querystring";
import { ILIASConfigProvider, ILIASInstallation, CONFIG_PROVIDER } from "src/app/config/ilias-config";
import { User } from "src/app/models/user";
import { AuthenticationProvider } from "src/app/providers/authentication.provider";
import { inject } from "@angular/core/testing";
import { calcPossibleSecurityContexts } from "@angular/compiler/src/template_parser/binding_parser";
import { TranslateService } from "@ngx-translate/core";
import { Settings } from "src/app/models/settings";

/**
 * @author gmangelsdorf <gmangelsdorf@zwh.de>
 * @version 1.0.0
 */

export interface CalendarSynchronization {

    /**
     * Synchronize the ilias calendar of the current authenticated user into the local device's calendar app.
     *
     * @returns {Promise<void>}
     */
    synchronize(): Promise<void>;
}



export const CALENDAR_SYNCHRONIZATION: InjectionToken<CalendarSynchronization> = new InjectionToken("token for calendar service synchronization");

@Injectable({
    providedIn: "root"
})

export class CalendarSynchronizationImpl implements CalendarSynchronization {

    private readonly log: Logger = Logging.getLogger(ILIASTokenManager.name)
    private clientTitle: string
    private settings: Settings


    constructor(
        private readonly platform: Platform,
        @Inject(CONFIG_PROVIDER) readonly config: ILIASConfigProvider,
        private readonly translate: TranslateService,
        private alertCtr: AlertController,
        @Inject(CALENDAR_REST) private readonly rest: CalendarRest,
        private nativeCalendar: Calendar
    ) {
    }

    async synchronize(): Promise<void> {
        this.settings = await Settings.findByUserId(AuthenticationProvider.getUser().id)

        if (this.settings.syncCalendar == true) {
            this.executeSynchronization()
            return
        }

        if (this.settings.askSyncCalendar == false) {
            return
        }

        this.alertCtr.create({
            header: this.translate.instant('calendar.alert-header'),
            message: this.translate.instant('calendar.alert-message'),
            buttons: [
                {
                    text: this.translate.instant('calendar.alert-never'),
                    handler: async (): Promise<void> => {
                        this.alertCtr.dismiss();
                        this.setPrefrence(false,false)
                    }
                },
                {
                    text: this.translate.instant('calendar.alert-once'),
                    handler: (): void => {
                        this.executeSynchronization();
                        this.alertCtr.dismiss();
                        this.setPrefrence(false,true)
                    }
                },
                {
                    text: this.translate.instant('calendar.alert-always'),
                    handler: (): void => {
                        this.executeSynchronization();
                        this.alertCtr.dismiss();
                        this.setPrefrence(true,false)
                    }
                }]

        }).then(alert => alert.present())
    }

    async setPrefrence(sync: boolean, ask: boolean) {
        this.settings.syncCalendar = sync
        this.settings.askSyncCalendar = ask
        this.settings.save()
    }


    async executeSynchronization(): Promise<any> {

        /**
         * get client name
         */
        if (this.clientTitle == undefined) {
            let installation = await this.config.loadInstallation(AuthenticationProvider.getUser().installationId)
            this.clientTitle = installation.title
        }

        //get events remotely,
        //delete ilias Calendars and add again
        const iliasCalendars: IliasCalendar[] = await this.rest.getCalendarEntries()
        await this.deleteCalendars()
        await this.createCalendars(iliasCalendars)
        await this.createEvents(iliasCalendars)
    }


    /**
     * Check if the named calendar exists
     */
    async calendarExists(name: string): Promise<boolean> {
        const localCalendars: [{ id: string, name: string }] = await this.nativeCalendar.listCalendars()
        return localCalendars.findIndex(el => el.name == `${name} (${this.clientTitle})`) == -1 ? false : true
    }

    /**
     * create calendar
     */
    async createCalendar(cal: IliasCalendar): Promise<any> {
        let calOptions = this.nativeCalendar.getCreateCalendarOptions()
        calOptions.calendarName = `${cal.calendar_title} (${this.clientTitle})`
        calOptions.calendarColor = cal.calendar_color
        let id = await this.nativeCalendar.createCalendar(calOptions)
        this.log.debug(() => "Created Calendar '" + cal.calendar_title + "' with id: " + id)
        if (id !== null)
            cal['id'] = +id
        else
            this.log.warn(() => "Created Calendar '" + cal.calendar_title + "' with id: " + id)
        return Promise.resolve()
    }

    /**
     * create Calendars from IliasCalendar Array
     */
    async createCalendars(calendars: IliasCalendar[]): Promise<any> {
        return calendars.reduce((prev, next) => {
            return prev.then(() => this.createCalendar(next))
        }, Promise.resolve())
    }

    /**
     * delete all ilias calendars from device calendar
     */
    async deleteCalendars() {
        const localCalendars: [{ id: string, name: string }] = await this.nativeCalendar.listCalendars()
        return localCalendars
            .filter(cal => cal.name.includes(` (${this.clientTitle})`))
            .reduce((prev, next) => {
                return prev.then(() => {
                    this.log.debug(() => "Deleting Calendar '" + next.name + "' with id: " + next.id)
                    return this.nativeCalendar.deleteCalendar(next.name)
                })
            }, Promise.resolve())
    }

    /**
     * create events from IliasCalendar Array
     */
    async createEvents(calendars: IliasCalendar[]) {
        this.log.debug(() => "Syncing events")
        const localCalendars: [{ id: string, name: string }] = await this.nativeCalendar.listCalendars()
        return calendars.reduce(async (prevC, nextC) => {
            await prevC;
            const localCalendarProps: { id: string, name: string } | undefined = localCalendars.find(el => el.name == `${nextC.calendar_title} (${this.clientTitle})`)
            return nextC.events.reduce(async (prevE, nextE) => {
                await prevE;
                const evtOptions = this.nativeCalendar.getCalendarOptions()
                evtOptions.calendarName = `${nextC.calendar_title} (${this.clientTitle})`
                evtOptions.calendarId = localCalendarProps !== undefined ? +localCalendarProps.id : nextC.hasOwnProperty('id') ? nextC['id'] : null
                this.log.debug(() => `creating event '${nextE.event_title}' in Calendar '${evtOptions.calendarName} | ${evtOptions.calendarId}' `)

                const dynamicTitle = nextE.event_subtitle !== null ? this.translate.instant(`calendar.${nextE.event_subtitle}`) : nextE.event_title

                return this.nativeCalendar.createEventWithOptions(
                    dynamicTitle,
                    nextE.event_location,
                    nextE.event_description,
                    new Date(nextE.event_beginDate * 1000),
                    new Date(nextE.event_endDate * 1000),
                    evtOptions
                );

            }, Promise.resolve());
        }, Promise.resolve())
    }







    async setSettings(sync: boolean) {

    }

}
