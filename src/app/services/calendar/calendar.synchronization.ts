import { CalendarRest, CALENDAR_REST, CalendarEntry } from "src/app/providers/ilias/calendar.rest";
import { AlertController } from "@ionic/angular";
import { Inject, InjectionToken, Injectable } from "@angular/core";

export interface CalendarSynchronization {

    /**
     * Synchronize the the news of the current authenticated user.
     *
     * @returns {Promise<void>}
     */
    synchronize(): Promise<void>;
  }

  export const CALENDAR_SYNCHRONIZATION: InjectionToken<CalendarSynchronization> = new InjectionToken("token for calendar service synchronization");

  @Injectable({
    providedIn: "root"
})
  export class CalendarSynchronizationImpl implements CalendarSynchronization{

      constructor(
          private alertCtr: AlertController,
          @Inject(CALENDAR_REST) private readonly rest: CalendarRest
      ){
      }

      async synchronize(): Promise<void> {
        const entries: CalendarEntry[] = await this.rest.getCalendarEntries()
        this.alertCtr.create({
                  header:'Got Calendar Entries',
                  message: `${entries[0].title}`,
                  buttons: [{
                      text: 'ok',
                      handler: (): void => {
                          this.alertCtr.dismiss();
                      }
                  }]
        }).then(alert => alert.present())

      }
  }
