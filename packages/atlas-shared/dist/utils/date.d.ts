/**
 * Consolidated Date Utilities for Atlas Financial
 * Eliminates duplicate date formatting and calculation patterns
 */
/**
 * Format date with customizable options
 */
export declare const formatDate: (date: string | Date, pattern?: string, options?: {
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: number;
    useAdditionalWeekYearTokens?: boolean;
    useAdditionalDayOfYearTokens?: boolean;
}) => string;
/**
 * Format date and time together
 */
export declare const formatDateTime: (date: string | Date, pattern?: string) => string;
/**
 * Format date for API consumption (ISO string)
 */
export declare const formatDateISO: (date: string | Date) => string;
/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export declare const formatRelativeTime: (date: string | Date, options?: {
    addSuffix?: boolean;
    locale?: Locale;
}) => string;
/**
 * Custom relative time with more granular control
 */
export declare const formatRelativeTimeCustom: (date: string | Date) => string;
/**
 * Check if date is today
 */
export declare const isToday: (date: string | Date) => boolean;
/**
 * Check if date is yesterday
 */
export declare const isYesterday: (date: string | Date) => boolean;
/**
 * Check if date is this week
 */
export declare const isThisWeek: (date: string | Date) => boolean;
/**
 * Check if date is this month
 */
export declare const isThisMonth: (date: string | Date) => boolean;
/**
 * Check if date is this year
 */
export declare const isThisYear: (date: string | Date) => boolean;
/**
 * Get days between two dates
 */
export declare const getDaysBetween: (startDate: string | Date, endDate: string | Date) => number;
/**
 * Get start of day
 */
export declare const getStartOfDay: (date: string | Date) => Date;
/**
 * Get end of day
 */
export declare const getEndOfDay: (date: string | Date) => Date;
/**
 * Parse date from various formats
 */
export declare const parseDate: (dateString: string) => Date | null;
/**
 * Validate date string
 */
export declare const isValidDate: (date: string | Date) => boolean;
/**
 * Get age from birth date
 */
export declare const getAge: (birthDate: string | Date) => number;
/**
 * Get fiscal year based on date (assuming April 1st start)
 */
export declare const getFiscalYear: (date: string | Date, fiscalYearStart?: number) => number;
/**
 * Get quarter from date
 */
export declare const getQuarter: (date: string | Date) => number;
/**
 * Check if date is business day (weekday)
 */
export declare const isBusinessDay: (date: string | Date) => boolean;
/**
 * Get next business day
 */
export declare const getNextBusinessDay: (date: string | Date) => Date;
/**
 * Format duration in human readable format
 */
export declare const formatDuration: (seconds: number) => string;
/**
 * Common date format patterns
 */
export declare const DATE_FORMATS: {
    readonly ISO: "yyyy-MM-dd";
    readonly ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
    readonly US_SHORT: "M/d/yyyy";
    readonly US_LONG: "MMMM d, yyyy";
    readonly EU_SHORT: "d/M/yyyy";
    readonly EU_LONG: "d MMMM yyyy";
    readonly TIME_12: "h:mm a";
    readonly TIME_24: "HH:mm";
    readonly DATETIME_12: "M/d/yyyy h:mm a";
    readonly DATETIME_24: "M/d/yyyy HH:mm";
    readonly MONTH_YEAR: "MMMM yyyy";
    readonly YEAR: "yyyy";
    readonly WEEKDAY: "EEEE";
    readonly SHORT_WEEKDAY: "EEE";
};
/**
 * Timezone utilities
 */
export declare const getTimezone: () => string;
export declare const formatInTimezone: (date: string | Date, timezone: string, pattern?: string) => string;
//# sourceMappingURL=date.d.ts.map
