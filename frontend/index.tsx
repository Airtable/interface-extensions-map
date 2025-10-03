import {useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {
    initializeBlock,
    useBase,
    useRecords,
    useCustomProperties,
    expandRecord,
} from '@airtable/blocks/interface/ui';
import {FieldType, Base, Field, Record} from '@airtable/blocks/interface/models';
import MapBoxMap, {Marker, NavigationControl} from 'react-map-gl/mapbox';
import type {ViewStateChangeEvent, MapRef} from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './style.css';

interface MapViewState {
    longitude: number;
    latitude: number;
    zoom: number;
}

function MapExtensionApp() {
    const base = useBase();
    const table = base.tables[0];
    const records = useRecords(table);

    // A list of properties that can be configured for this extension
    const getCustomProperties = useCallback((base: Base) => {
        const table = base.tables[0];
        const textFieldTypes = [FieldType.SINGLE_LINE_TEXT, FieldType.MULTILINE_TEXT];
        const textFields = table.fields.filter(
            (field: Field) =>
                // Text fields
                textFieldTypes.includes(field.type) ||
                // Fields that produce a text value
                (field.config.options &&
                    'result' in field.config.options &&
                    field.config.options.result &&
                    textFieldTypes.includes(field.config.options.result.type)),
        );

        return [
            {
                key: 'mapboxApiKey',
                type: 'string' as const,
                label: 'Mapbox token',
                defaultValue: '',
            },
            {
                key: 'labelField',
                type: 'field' as const,
                label: 'Label field',
                table: table,
                possibleValues: textFields,
            },
            {
                key: 'addressField',
                type: 'field' as const,
                label: 'Address field',
                table: table,
                possibleValues: textFields,
            },
            {
                key: 'autoCenterOnLoad',
                type: 'boolean' as const,
                label: 'Automatically center map',
                defaultValue: true,
            },
            {
                key: 'zoomToPinOnClick',
                type: 'boolean' as const,
                label: 'Zoom to pin on click',
                defaultValue: true,
            },
        ];
    }, []);

    const {customPropertyValueByKey, errorState} = useCustomProperties(getCustomProperties);

    // Current view state of the map (managed by custom hook)
    const storageKey = useMemo(() => `mapView:${base.id}:${table.id}`, [base.id, table.id]);
    const {viewState, setViewState, savedViewRef, initialCameraAppliedRef} = useMapViewState(
        storageKey,
        {
            // Default location when nothing else is available (New York City)
            longitude: -74.5,
            latitude: 40,
            zoom: 9,
        },
    );

    const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
    const mapRef = useRef<MapRef | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Extract individual field values to avoid object reference issues
    const mapboxApiKey = customPropertyValueByKey.mapboxApiKey as string;
    const labelField = customPropertyValueByKey.labelField as Field | undefined;
    const addressField = customPropertyValueByKey.addressField as Field | undefined;
    const zoomToPinOnClick = (customPropertyValueByKey.zoomToPinOnClick as boolean) ?? true;
    const autoCenterOnLoad = (customPropertyValueByKey.autoCenterOnLoad as boolean) ?? true;

    // Check if required custom properties are configured
    const isConfigured = Boolean(mapboxApiKey && labelField && addressField);

    // Create a stable hash of record data to detect actual changes
    const recordsHash = useMemo(() => {
        if (!isConfigured) return '';

        const relevantData = records.map((record) =>
            [
                record.id,
                record.getCellValueAsString(labelField!),
                record.getCellValueAsString(addressField!),
            ].join('::'),
        );

        return relevantData.join('||');
    }, [records, labelField, addressField, isConfigured]);

    // Use a ref to store previous hash and stable data
    const previousHashRef = useRef<string>('');
    const stableDataRef = useRef<LocationData[]>([]);

    // Only update stable data when hash actually changes
    if (recordsHash !== previousHashRef.current) {
        previousHashRef.current = recordsHash;

        if (records && isConfigured) {
            stableDataRef.current = records.map((record) => ({
                id: record.id,
                name: record.getCellValueAsString(labelField!),
                address: record.getCellValueAsString(addressField!),
                lat: null,
                lng: null,
                geoCache: null,
                record: record,
            }));
        } else {
            stableDataRef.current = [];
        }
    }

    const stableRecordsData = stableDataRef.current;

    // Prepare inputs and run geocoding via hook
    const geocodingInputs = useMemo(() => {
        return stableRecordsData.map((r) => ({
            id: r.id,
            name: r.name,
            address: r.address,
            record: r.record,
        }));
    }, [stableRecordsData]);

    const {locations, geocodingStatus} = useGeocoding({
        records: geocodingInputs,
        apiKey: mapboxApiKey,
        enabled: isConfigured,
    });

    const hasGeocodingWork = geocodingInputs.length > 0;

    // Decide initial view once, preferring auto-fit when allowed, otherwise fallback to saved view.
    useEffect(() => {
        if (!isConfigured || !isMapReady || initialCameraAppliedRef.current) return;

        // Wait until geocoding has definitely started before deciding how to center.
        if (autoCenterOnLoad && hasGeocodingWork && geocodingStatus === GeocodingStatus.Idle) {
            return;
        }

        // 1) Prefer auto-fit when allowed and locations are available
        if (autoCenterOnLoad && locations.length > 0) {
            if (locations.length === 1) {
                const only = locations[0];
                setViewState({
                    latitude: only.lat!,
                    longitude: only.lng!,
                    zoom: 12,
                });
            } else {
                const lats = locations.map((l) => l.lat!);
                const lngs = locations.map((l) => l.lng!);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);

                const bounds = new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);

                const mapInstance = mapRef.current?.getMap?.();
                if (mapInstance) {
                    const camera = mapInstance.cameraForBounds(bounds, {padding: 80});
                    if (camera && camera.center) {
                        const center = mapboxgl.LngLat.convert(
                            camera.center as mapboxgl.LngLatLike,
                        );
                        const zoomValue = typeof camera.zoom === 'number' ? camera.zoom : 8;
                        setViewState({
                            latitude: center.lat,
                            longitude: center.lng,
                            zoom: Math.min(Math.max(zoomValue, 1), 16),
                        });
                    }
                } else {
                    const centerLat = (minLat + maxLat) / 2;
                    const centerLng = (minLng + maxLng) / 2;
                    setViewState({
                        latitude: centerLat,
                        longitude: centerLng,
                        zoom: 8,
                    });
                }
            }
            initialCameraAppliedRef.current = true;
            return;
        }

        // 2) If geocoding is still running and centering is allowed, wait before applying saved view
        if (autoCenterOnLoad && hasGeocodingWork && geocodingStatus === GeocodingStatus.Running) {
            return;
        }

        // 3) Otherwise, apply saved view if available; regardless, mark as applied to avoid re-runs
        if (savedViewRef.current) {
            setViewState(savedViewRef.current);
        }
        initialCameraAppliedRef.current = true;
    }, [
        isConfigured,
        isMapReady,
        autoCenterOnLoad,
        geocodingStatus,
        locations,
        savedViewRef,
        initialCameraAppliedRef,
        setViewState,
        hasGeocodingWork,
    ]);

    // Handle marker click
    const handleMarkerClick = (location: LocationData) => {
        const shouldExpandRecords = table.hasPermissionToExpandRecords();
        if (zoomToPinOnClick) {
            const mapInstance = mapRef.current?.getMap?.();
            const desiredZoom = 14;
            if (mapInstance) {
                const container = mapInstance.getContainer?.();
                const width = container ? container.clientWidth : 0;
                // Compute horizontal offset so the pin is centered in the visible area when the
                // rightmost 700px are covered by the record details panel. We "pretend" the
                // viewport width is reduced by 700px and center within that space.
                // Mapbox flyTo offset is relative to the viewport center: positive X moves right.
                // Therefore, to shift the center left by half the overlay width, we use -overlay/2.
                const overlayWidthPx = 700;
                const effectiveOverlay = width ? Math.min(overlayWidthPx, width) : overlayWidthPx;
                const offsetXFromCenter = !shouldExpandRecords
                    ? 0
                    : -Math.round(effectiveOverlay / 2);
                mapInstance.flyTo({
                    center: [location.lng!, location.lat!],
                    zoom: desiredZoom,
                    offset: [offsetXFromCenter, 0],
                });
            } else {
                setViewState({
                    latitude: location.lat!,
                    longitude: location.lng!,
                    zoom: desiredZoom,
                });
            }
        }

        // Open record detail page if permissions allow
        if (shouldExpandRecords) {
            expandRecord(location.record);
        }
    };

    // Show configuration instructions if not configured
    if (!isConfigured) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <div className="text-center">
                    <div
                        style={{width: '525px'}}
                        className="inline-flex flex-col justify-start items-center gap-3"
                    >
                        <div className="justify-start text-3xl font-semibold text-black dark:text-white leading-7">
                            This map has not been configured
                        </div>
                        <div className="justify-center text-left text-lg text-gray-500 dark:text-gray-300 leading-6">
                            <ol className="list-decimal">
                                <li>
                                    Sign up for a{' '}
                                    <a
                                        href="https://www.mapbox.com/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:cursor-pointer hover:opacity-50"
                                    >
                                        Mapbox account
                                    </a>{' '}
                                    and create an{' '}
                                    <a
                                        href="https://console.mapbox.com/account/access-tokens/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:cursor-pointer hover:opacity-50"
                                    >
                                        access token
                                    </a>
                                    .
                                </li>
                                <li>In Airtable, fill out this element’s custom properties.</li>
                                <li>
                                    To open a record when clicking a pin, enable{' '}
                                    <span className="font-semibold">Click into record details</span>
                                    .
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (errorState) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900 p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
                        Configuration Error
                    </h2>
                    <p className="text-red-700 dark:text-red-200">
                        {errorState.error?.message ||
                            'There was an error with the custom properties configuration.'}
                    </p>
                </div>
            </div>
        );
    }

    // Unify loading state: hide map until initial camera applied and (if needed) geocoding completed
    const shouldWaitForGeocoding =
        isConfigured && hasGeocodingWork && geocodingStatus !== GeocodingStatus.Completed;

    // Render the map
    const hideMapUntilCameraReady = !initialCameraAppliedRef.current || shouldWaitForGeocoding;
    return (
        <div className="w-full h-screen relative">
            {hideMapUntilCameraReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Preparing map…</span>
                    </div>
                </div>
            )}
            <MapBoxMap
                mapLib={mapboxgl}
                {...viewState}
                style={{
                    width: '100%',
                    height: '100%',
                    visibility: hideMapUntilCameraReady ? 'hidden' : 'visible',
                }}
                onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                ref={mapRef}
                onLoad={() => setIsMapReady(true)}
                mapboxAccessToken={mapboxApiKey}
                mapStyle={'mapbox://styles/mapbox/standard'}
                minZoom={1}
                maxZoom={18}
            >
                <NavigationControl />

                {locations.map((location) => (
                    <Marker
                        key={location.id}
                        longitude={location.lng!}
                        latitude={location.lat!}
                        style={{zIndex: hoveredLocationId === location.id ? 1000 : 1}}
                    >
                        <div
                            className="relative group cursor-pointer transform hover:scale-110 transition-transform"
                            onClick={() => handleMarkerClick(location)}
                            onMouseEnter={() => setHoveredLocationId(location.id)}
                            onMouseLeave={() =>
                                setHoveredLocationId((prev) => (prev === location.id ? null : prev))
                            }
                        >
                            <div className="bg-red-500 hover:bg-red-600 w-6 h-6 rounded-full border-2 border-white shadow-lg relative">
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-red-500 hover:border-t-red-600"></div>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                {location.name}
                            </div>
                        </div>
                    </Marker>
                ))}
            </MapBoxMap>
        </div>
    );
}

initializeBlock({interface: () => <MapExtensionApp />});

export interface LocationData {
    id: string;
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
    geoCache: string | null;
    record: Record;
}

export enum GeocodingStatus {
    Idle = 'idle',
    Running = 'running',
    Completed = 'completed',
}

type InputRecord = {
    id: string;
    name: string;
    address: string;
    record: Record;
};

export function useGeocoding({
    records,
    apiKey,
    enabled = true,
}: {
    records: ReadonlyArray<InputRecord>;
    apiKey: string;
    enabled?: boolean;
}) {
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [geocodingStatus, setGeocodingStatus] = useState<GeocodingStatus>(GeocodingStatus.Idle);
    const geoMemoryCacheRef = useRef<Map<string, {lat: number; lng: number}>>(new Map());

    useEffect(() => {
        if (!enabled || !apiKey || !records || records.length === 0) {
            setLocations([]);
            setGeocodingStatus(GeocodingStatus.Idle);
            return;
        }

        let didCancel = false;

        const geocodeAddress = async (
            address: string,
            cacheKey: string,
        ): Promise<{lat: number; lng: number} | null> => {
            if (!apiKey || !address) return null;

            const cached = geoMemoryCacheRef.current.get(cacheKey);
            if (cached) {
                return cached;
            }

            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`,
                );
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    const coords = {lat, lng} as const;
                    geoMemoryCacheRef.current.set(cacheKey, coords);
                    return coords;
                }
            } catch (error) {
                console.error('Geocoding error:', error);
            }

            return null;
        };

        const process = async () => {
            setGeocodingStatus(GeocodingStatus.Running);
            const out: LocationData[] = [];

            for (const r of records) {
                const {id, name, address, record} = r;
                if (!address) continue;

                const normalizedAddress = address.toLowerCase().trim();
                const coords = await geocodeAddress(address, normalizedAddress);
                if (coords) {
                    out.push({
                        id,
                        name: name || address,
                        address,
                        lat: coords.lat,
                        lng: coords.lng,
                        geoCache: normalizedAddress,
                        record,
                    });
                }
            }

            if (!didCancel) {
                setLocations(out);
                setGeocodingStatus(GeocodingStatus.Completed);
            }
        };

        process();

        return () => {
            didCancel = true;
        };
    }, [records, apiKey, enabled]);

    return {locations, geocodingStatus};
}

/**
 * Manages map view state and localStorage persistence
 */
export function useMapViewState(storageKey: string, defaultState: MapViewState) {
    const [viewState, setViewState] = useState<MapViewState>(defaultState);
    const savedViewRef = useRef<MapViewState | null>(null);
    const initialCameraAppliedRef = useRef<boolean>(false);

    // Load saved view from localStorage (without applying immediately to avoid flicker if auto-fit will run)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed.latitude === 'number' &&
                    typeof parsed.longitude === 'number' &&
                    typeof parsed.zoom === 'number'
                ) {
                    savedViewRef.current = parsed as MapViewState;
                }
            }
        } catch {
            // ignore
        }
    }, [storageKey]);

    // Persist view to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(viewState));
        } catch {
            // ignore
        }
    }, [storageKey, viewState]);

    return {viewState, setViewState, savedViewRef, initialCameraAppliedRef};
}
