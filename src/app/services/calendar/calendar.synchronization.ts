import { CalendarRest, CALENDAR_REST, CalendarEntry, IliasCalendar } from "src/app/providers/ilias/calendar.rest";
import { AlertController, Platform, ToastController } from "@ionic/angular";
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
import { OpenNativeSettings } from '@ionic-native/open-native-settings/ngx';


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
    hasPermission(): Promise<boolean>
    synchronize(): Promise<void>
    remove(): Promise<void>
}



export const CALENDAR_SYNCHRONIZATION: InjectionToken<CalendarSynchronization> = new InjectionToken("token for calendar service synchronization");

@Injectable({
    providedIn: "root"
})

export class CalendarSynchronizationImpl implements CalendarSynchronization {

    private readonly log: Logger = Logging.getLogger("Calendar Synchronization Service")
    private clientTitle: string
    private settings: Settings

    constructor(
        private readonly platform: Platform,
        @Inject(CONFIG_PROVIDER) readonly config: ILIASConfigProvider,
        private readonly translate: TranslateService,
        private alertCtr: AlertController,
        @Inject(CALENDAR_REST) private readonly rest: CalendarRest,
        private nativeCalendar: Calendar,
        private nativeSettings: OpenNativeSettings,
        private toast: ToastController
    ) {
    }


    async hasPermission(): Promise<boolean> {
        const hasRead = await this.nativeCalendar.hasReadPermission()
        const hasReadWrite = await this.nativeCalendar.hasReadWritePermission()
        const hasWrite = await this.nativeCalendar.hasWritePermission()

       this.log.debug(() => "Has read permission: " +  hasRead)
       this.log.debug(() => "Has readWrite permission: " +  hasReadWrite)
       this.log.debug(() => "Has hasWrite permission: " +  hasWrite)

      return this.nativeCalendar.hasWritePermission()
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
                        this.settings.save()
                    }
                },
                {
                    text: this.translate.instant('calendar.alert-once'),
                    handler: (): void => {
                        this.executeSynchronization().then(() => {
                            this.setPrefrence(false,true)
                        });
                        this.alertCtr.dismiss();
                    }
                },
                {
                    text: this.translate.instant('calendar.alert-always'),
                    handler: (): void => {
                        this.executeSynchronization().then( async () => {
                            this.setPrefrence(true,false)
                        });
                        this.alertCtr.dismiss();
                    }
                }]

        }).then(alert => alert.present())
    }


    async setPrefrence(sync: boolean, ask: boolean) {
        this.settings.syncCalendar = sync
        this.settings.askSyncCalendar = ask
        this.settings.save()
    }

    /**
     * Check device permission to access calendar
     */
    async alertPermission(): Promise<boolean> {
        const hasPermission = await this.hasPermission()
        if (!hasPermission) {
            const alert = await this.alertCtr.create({
                header: this.translate.instant('calendar.grant-access-header'),
                message: this.translate.instant('calendar.grant-access-message'),
                buttons: [
                    {
                        text: this.translate.instant('calendar.native-settings'),
                        handler: (): void => {
                            this.alertCtr.dismiss();
                            this.nativeSettings.open("application_details")
                        }
                    },
                    {
                        text: this.translate.instant('calendar.grant-access-ok'),
                        handler: (): void => {
                            this.alertCtr.dismiss();
                        }
                    }
                ]
            })

           await alert.present()
           this.log.debug( () => "No access rights granted" )
           return Promise.resolve(false)
        }
        this.log.debug( () => "Access rights granted" )

     return  Promise.resolve(true)
    }

    async alertPermissionOnRemoval(e: any) {
        const alert = await this.alertCtr.create({
            header: this.translate.instant('calendar.remove-failed-header'),
            message: e,
            buttons: [
                {
                    text: this.translate.instant('calendar.native-settings'),
                    handler: (): void => {
                        this.alertCtr.dismiss();
                        this.nativeSettings.open("application_details")
                    }
                },
                {
                    text: this.translate.instant('calendar.grant-access-ok'),
                    handler: (): void => {
                        this.alertCtr.dismiss();
                    }
                }
            ]
        })

       await alert.present()
    }

    //remove the calendar
    async remove():Promise<void>{

        //TODO Lazy load this
        if (this.clientTitle == undefined) {
            let installation = await this.config.loadInstallation(AuthenticationProvider.getUser().installationId)
            this.clientTitle = installation.title
        }

       try {
        if (await this.hasPermission() && await this.calendarsInstalled()){
            await this.deleteCalendars()
            this.showToast(this.translate.instant("calendar.deleted"))
        }
       }
       catch (e) {
            this.alertPermissionOnRemoval(e)
       }

    }



        //get events remotely,
        //delete ilias Calendars and add again

    async executeSynchronization(): Promise<any> {


        /**
         * get client name
         */
        if (this.clientTitle == undefined) {
            let installation = await this.config.loadInstallation(AuthenticationProvider.getUser().installationId)
            this.clientTitle = installation.title
        }

        try {
            const iliasCalendars: IliasCalendar[] = await this.rest.getCalendarEntries()
            await this.deleteCalendars()
            await this.createCalendars(iliasCalendars)
            await this.createEvents(iliasCalendars)
        } catch(e) {
            this.log.debug(()=> e.message)
        }

        this.alertPermission().then(granted => granted ? this.showToast(this.translate.instant('calendar.success')) : this.showToast(this.translate.instant('calendar.failure')))
    }


    /**
     * Check if the named calendar exists
     */
    async calendarExists(name: string): Promise<boolean> {
        const localCalendars: [{ id: string, name: string }] = await this.nativeCalendar.listCalendars()
        return localCalendars.findIndex(el => el.name == `${name} (${this.clientTitle})`) == -1 ? false : true
    }

    /**
     * Checks if there are any course calendars installed on the device
     */
    async calendarsInstalled(): Promise<boolean>{
        const localCalendars: [{ id: string, name: string }] = await this.nativeCalendar.listCalendars()
        const myCalendars = localCalendars.filter(x => {
            const included = x.name.includes(this.clientTitle)
            this.log.debug(()=> `${this.clientTitle} is included in ${x.name}: ${included} `  )
            return included
        })
        this.log.debug(() => `has Calendars: ${myCalendars.length > 0}, length: ${myCalendars.length}`)
        return myCalendars.length > 0
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



    async showToast(msg: string) {
        await this.toast.create({
            message: msg,
            duration: 3000
        }).then((it: HTMLIonToastElement) => it.present());
    }

}
