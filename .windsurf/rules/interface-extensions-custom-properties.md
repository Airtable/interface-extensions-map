---
description: Airtable Interface Extensions - custom properties (v0.2.1, 2025-07-02)
trigger: always_on
---

<custom_properties>

-   Custom properties are a feature of Interface Extensions that allow Interface Extensions to let
    Airtable builders configure properties of the Interface Extension on each Interface page it is
    used on
-   To use custom properties:
    1. Import the `useCustomProperties` hook
    2. Define your properties in a function. This function receives the current `base` and returns
       an array of `BlockPageElementCustomProperty` objects.
        - `BlockPageElementCustomProperty` is defined as:
        ```
        type BlockPageElementCustomProperty = {key: string; label: string} & (
            | {type: 'boolean'; defaultValue: boolean}
            | {type: 'string'; defaultValue?: string}
            | {
                type: 'enum';
                possibleValues: Array<{value: string; label: string}>;
                defaultValue?: string;
                }
            | {
                type: 'field';
                table: Table;
                possibleValues?: Array<Field>; // If not provided, all visible fields in the table will be shown in the dropdown.
                defaultValue?: Field;
                }
            );
        ```
    3. Important: wrap the function in `useCallback` or define it outside of the component. This
       ensures a stable identity, which is important for memoization and for subscribing to schema
       changes correctly.
    4. Call `useCustomProperties` with your function. It returns an object with:
        - `customPropertyValueByKey`: a mapping of each property's key to its current value.
        - `errorState`: if present, contains an error from trying to set up custom properties.
-   Custom properties should be used to define values that are required for the Interface Extension
    to work at all
-   Custom properties should be used to define required fields from the underlying Airtable data, to
    avoid hard-coding field names into the code of the Interface Extension
    -   Make it easier for builders configuring the custom properties by filtering to only show
        fields with the relevant type (e.g. single select fields, number fields). To do this, within
        your function that is passed to `useCustomProperties`, access the current table using
        `base.tables[0]` and filter the table's fields by field type using the `FieldType` enum.
        Pass the filtered fields into the `possibleValues` array parameter of the custom property
    -   If the prompt includes specific named fields, check that if these fields exist in the
        current table by comparing to the `name` property of the values in the `table.fields` array.
        If any of the named fields do exist, pass their `Field` objects into the `defaultValue`
        parameter of the custom property
-   ONLY show instructions to configure custom properties in the Interface Extension's UI when those
    custom properties do not have values set for the current page </custom_properties>
