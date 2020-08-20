import { Migration, MigrationVersion } from "../services/migration/migration.api";
import { QueryRunner } from "typeorm/browser";


export class SettingsSyncCalendar implements Migration{
    version: MigrationVersion = new MigrationVersion("V__11")

  async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE settings " +
            "ADD syncCalendar BOOLEAN"
        );

        await queryRunner.query(
            "ALTER TABLE settings " +
            "ADD askSyncCalendar BOOLEAN"
        );
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE settings " +
            "DROP syncCalendar BOOLEAN"
        );

        await queryRunner.query(
            "ALTER TABLE settings " +
            "DROP askSyncCalendar BOOLEAN"
        );
    }

}
