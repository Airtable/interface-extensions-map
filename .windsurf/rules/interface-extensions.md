---
description: Airtable Interface Extensions development (v0.2.1, 2025-07-02)
trigger: always_on
---

You are developing an Interface Extension which extends Airtable's built-in Interfaces with custom
UI to serve a specific need or use case.

<blocks_sdk>

-   Import Airtable Blocks SDK hooks and functions (like `initializeBlock`, `useBase`, `useRecords`,
    `useCustomProperties`, `useColorScheme` and `expandRecord`) from '@airtable/blocks/interface/ui'
    NOT '@airtable/blocks/ui'
-   Import the `FieldType` enum from '@airtable/blocks/interface/models' NOT
    '@airtable/blocks/models'
-   Don't import any Airtable Blocks UI elements like `Box` as these are not supported in Interface
    Extensions
-   The entrypoint for an Interface Extension is `frontend/index.tsx` and you should focus your
    editing there (or on components that are then imported there)
-   The `frontend/index.tsx` file should conclude with an `initializeBlock` call that looks like:
    `initializeBlock({ interface: () => <MyComponent /> });` where `MyComponent` is the name of the
    root component to be rendered
-   To retrieve information about the current user, import the `useSession` hook which returns the
    current session. `session.currentUser` will provide attributes about the user: `email`, `id`,
    `name` and `profilePicUrl` (optional).
-   When working with single select or multiple select fields, if you ever need to use the color
    that corresponds to a specific choice/select option, use the `colorUtils.getHexForColor` SDK
    method to convert it to a hex code. </blocks_sdk>

<reading_airtable_data>

-   Interface Extensions can only access one table of Airtable data. That table's data is available
    by:
    1. Importing `useBase` and `useRecords` hooks
    2. Calling
       `const base = useBase(); const table = base.tables[0]; const records = useRecords(table);`
-   DO NOT use `base.getTableByName(string)` as it is not supported in Interface Extensions
-   DO NOT attempt to access records from other tables, as this is not supported in Interface
    Extensions
-   Airtable records returned by `useRecords(table)` may change without warning at any time, whether
    because records were created, edited or deleted, the user's permissions were updated, or filters
    applied to the records by the Interface page changed. </reading_airtable_data>

<editing_airtable_data>

-   Depending on the configuration of the Interface Extension and the specific fields you're trying
    to edit, adding/editing/deleting records may not be allowed.
    -   Check whether you are able to add record(s) BEFORE trying to add them by using
        `table.hasPermissionToCreateRecords(records?: ReadonlyArray<{ fields?: ObjectMap<FieldId | string, unknown | void> | void; }>) => boolean`.
        (e.g. the record and/or the specific fields you want to add), the more accurate the
        permission check will be, but none of the parameters are required.
    -   Check whether you are able to edit record(s) in the way you intend to BEFORE trying to edit
        them by using
        `table.hasPermissionToUpdateRecords(records?: ReadonlyArray<{fields?: ObjectMap<FieldId | string, unknown | void> | void;id?: RecordId | void; }>) => boolean`.
    -   Check whether you are able to delete record(s) BEFORE trying to delete them by using
        `table.hasPermissionToDeleteRecords(recordsOrRecordIds?: ReadonlyArray<Record | RecordId>) => boolean`
-   To add records, use
    `table.createRecordAsync(fields: ObjectMap<FieldId | string, unknown> = {}) => Promise<RecordId>`
    for one record or
    `table.createRecordsAsync((records: ReadonlyArray<{ fields: ObjectMap<FieldId | string, unknown>; }>) => Promise<Array<RecordId>>`
    for multiple records
-   To edit records, use
    `table.updateRecordAsync(recordOrRecordId: Record | RecordId, fields: ObjectMap<FieldId | string, unknown>) => Promise<void>`
    for one record or
    `table.updateRecordsAsync(records: ReadonlyArray<{fields: ObjectMap<FieldId | string, unknown>; id: RecordId; }>) => Promise<void>`
    for multiple records
-   To set values for fields with type `MULTIPLE_RECORD_LINKS`, you can use
    `record.fetchForeignRecordsAsync( field: Field, filterString: string ) => Promise<{ records: ReadonlyArray<{ displayName: string; id: RecordId; }>; }>`
    to return possible values for these fields.
    -   Use the `filterString` property to search for record values based on user input. An empty
        `filterString` parameter will return an initial set of results that the user can then filter
        down.
-   To delete records, use
    `table.deleteRecordAsync(recordOrRecordId: Record | RecordId) => Promise<void>` for one record
    or
    `table.deleteRecordsAsync(recordsOrRecordIds: ReadonlyArray<Record | RecordId>) => Promise<void>`
    for multiple records
-   When adding/editing/deleting multiple records, you may only add/edit/delete up to 50 records per
    call, and calls are rate-limited to 15 per second, so `await` each call to avoid these limits
    </editing_airtable_data>

<credentials_for_third_party_integrations>

-   Interface Extensions can be used to integrate with third-party systems (e.g. sources of data or
    tools) that require credentials (like API keys, usernames or passwords) to authenticate with
-   ALWAYS use <custom_properties> to allow builders to configure credentials rather than storing
    them in the code of your Interface Extension \* Inform the user that you have used custom
    properties to store any credentials when responding to the prompt
    </credentials_for_third_party_integrations>

<record_detail_pages>

-   Airtable Interfaces provide Record Detail pages, which allow users to see much more detail about
    a specific record, edit data, run Automations relating to that record and more. You can open
    Record Detail pages from an Interface Extension by importing the `expandRecord` function and
    calling `expandRecord(record)` to open a Record Detail page - passing the complete `Record`
    object - typically from a click event
-   Based on the configuration of the Interface page, users may not have permission to open Record
    Detail pages. Call `table.hasPermissionToExpandRecords()` to check whether the user has
    permission to open Record Detail pages BEFORE showing UI that opens Record Detail pages.
-   Opening Record Detail pages directly is the preferred approach to show more detail about a
    specific record rather than using popovers or custom detail panes, unless specifically
    instructed </record_detail_pages>

<third_party_libraries>

-   Unless specifically instructed to use a different library, prefer the following npm packages
    (and import the libraries however their documentation recommends):
    -   react-vega: for rendering charts and data visualizations
    -   @google/model-viewer: for rendering 3D models
    -   mapbox-gl: for rendering maps when instructed to use Mapbox ONLY
    -   react-simple-maps: for rendering simple or abstract geographic maps
    -   marked: for parsing Markdown
    -   @phosphor-icons/react: for icons
    -   @dnd-kit/core: for drag & drop interactions
-   Make sure to install third-party libraries first (don't depend on that being done for you)
-   If a third-party library doesn't list React 19 as a peer dependency, use the
    `--legacy-peer-deps` flag when installing npm packages.
-   Read third-party library documentation thoroughly and carefully to understand best practices to
    make use of its functionality. Look up multiple examples to make sure you understand correct
    usage of all API methods and return types. DO NOT invent or create API methods in third-party
    libraries </third_party_libraries>

<appearance>
* Unless specifically instructed otherwise, use Tailwind for styling (no import needed).
* Support both dark and light modes by using `prefers-color-scheme` CSS feature.
    * If using Tailwind, use the `dark:` class prefixes to ensure dark mode is supported
    * If you need to check the appearance mode in JavaScript, import the `useColorScheme` hook which returns `{colorScheme: "dark" | "light"}`
* If you need to include icons, use the @phosphor-icons/react library. When importing components from this library, always append the Icon suffix. For example, instead of importing `ArrowRight`, import `ArrowRightIcon`.
* Make sure this Interface Extension uses the entire width and height of its container by default and is not limited by the width or height of its content. The Interface Extension can scroll horizontally or vertically if needed.
</appearance>
