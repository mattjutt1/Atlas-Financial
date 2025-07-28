/**
 * Consolidated Date Utilities for Atlas Financial
 * Eliminates duplicate date formatting and calculation patterns
 */

import { format, parseISO, isValid, differenceInDays, addDays, startOfDay, endOfDay, isWithinInterval, formatDistanceToNow } from 'date-fns'

/**
 * Format date with customizable options
 */
export const formatDate = (
  date: string | Date,
  pattern: string = 'MMM dd, yyyy',
  options?: {
    locale?: Locale
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
    firstWeekContainsDate?: number
    useAdditionalWeekYearTokens?: boolean
    useAdditionalDayOfYearTokens?: boolean
  }
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid date')
    }
    
    return format(dateObj, pattern, options)
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Format date and time together
 */
export const formatDateTime = (
  date: string | Date,
  pattern: string = 'MMM dd, yyyy h:mm a'
): string => {
  return formatDate(date, pattern)
}

/**
 * Format date for API consumption (ISO string)
 */
export const formatDateISO = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid date')
    }
    
    return dateObj.toISOString()
  } catch (error) {
    throw new Error(`Invalid date: ${date}`)
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (
  date: string | Date,
  options?: {
    addSuffix?: boolean
    locale?: Locale
  }
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid date')
    }
    
    return formatDistanceToNow(dateObj, { addSuffix: true, ...options })
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Custom relative time with more granular control
 */
export const formatRelativeTimeCustom = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

    if (diffInSeconds < 0) {
      const futureDiff = Math.abs(diffInSeconds)
      if (futureDiff < 60) return 'in a few seconds'
      if (futureDiff < 3600) return `in ${Math.floor(futureDiff / 60)}m`
      if (futureDiff < 86400) return `in ${Math.floor(futureDiff / 3600)}h`
      if (futureDiff < 2592000) return `in ${Math.floor(futureDiff / 86400)}d`
      return 'in the future'
    }

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    return `${Math.floor(diffInSeconds / 31536000)}y ago`
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Check if date is today
 */
export const isToday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    
    return dateObj.toDateString() === today.toDateString()
  } catch (error) {
    return false
  }
}

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const yesterday = addDays(new Date(), -1)
    
    return dateObj.toDateString() === yesterday.toDateString()
  } catch (error) {
    return false
  }
}

/**
 * Check if date is this week
 */
export const isThisWeek = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    const weekAgo = addDays(today, -7)
    
    return isWithinInterval(dateObj, { start: weekAgo, end: today })
  } catch (error) {
    return false
  }
}

/**
 * Check if date is this month
 */
export const isThisMonth = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    
    return dateObj.getMonth() === today.getMonth() && 
           dateObj.getFullYear() === today.getFullYear()
  } catch (error) {
    return false
  }
}

/**
 * Check if date is this year
 */
export const isThisYear = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    
    return dateObj.getFullYear() === today.getFullYear()
  } catch (error) {
    return false
  }
}

/**
 * Get days between two dates
 */
export const getDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
    
    return differenceInDays(end, start)
  } catch (error) {
    return 0
  }
}

/**
 * Get start of day
 */
export const getStartOfDay = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return startOfDay(dateObj)
}

/**
 * Get end of day
 */
export const getEndOfDay = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return endOfDay(dateObj)
}

/**
 * Parse date from various formats
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    // Try ISO format first
    let parsed = parseISO(dateString)
    if (isValid(parsed)) return parsed
    
    // Try standard Date constructor
    parsed = new Date(dateString)
    if (isValid(parsed)) return parsed
    
    // Try common formats
    const commonFormats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'yyyy-MM-dd HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss'
    ]
    
    for (const formatString of commonFormats) {
      try {
        // This would require date-fns parse function with format
        // For now, return null for unrecognized formats
        break
      } catch {
        continue
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Validate date string
 */
export const isValidDate = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj)
  } catch (error) {
    return false
  }
}

/**
 * Get age from birth date
 */
export const getAge = (birthDate: string | Date): number => {
  try {
    const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
    const today = new Date()
    
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  } catch (error) {
    return 0
  }
}

/**
 * Get fiscal year based on date (assuming April 1st start)
 */
export const getFiscalYear = (date: string | Date, fiscalYearStart: number = 4): number => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1 // JavaScript months are 0-indexed
    
    return month >= fiscalYearStart ? year : year - 1
  } catch (error) {
    return new Date().getFullYear()
  }
}

/**
 * Get quarter from date
 */
export const getQuarter = (date: string | Date): number => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const month = dateObj.getMonth() + 1
    
    return Math.ceil(month / 3)
  } catch (error) {
    return 1
  }
}

/**
 * Check if date is business day (weekday)
 */
export const isBusinessDay = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const dayOfWeek = dateObj.getDay()
    
    return dayOfWeek >= 1 && dayOfWeek <= 5 // Monday to Friday
  } catch (error) {
    return false
  }
}

/**
 * Get next business day
 */
export const getNextBusinessDay = (date: string | Date): Date => {
  try {
    let nextDay = typeof date === 'string' ? parseISO(date) : new Date(date)
    
    do {
      nextDay = addDays(nextDay, 1)
    } while (!isBusinessDay(nextDay))
    
    return nextDay
  } catch (error) {
    return new Date()
  }
}

/**
 * Format duration in human readable format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  
  const days = Math.floor(seconds / 86400)
  const remainingHours = Math.floor((seconds % 86400) / 3600)
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/**
 * Common date format patterns
 */
export const DATE_FORMATS = {
  ISO: 'yyyy-MM-dd',
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  US_SHORT: 'M/d/yyyy',
  US_LONG: 'MMMM d, yyyy',
  EU_SHORT: 'd/M/yyyy',
  EU_LONG: 'd MMMM yyyy',
  TIME_12: 'h:mm a',
  TIME_24: 'HH:mm',
  DATETIME_12: 'M/d/yyyy h:mm a',
  DATETIME_24: 'M/d/yyyy HH:mm',
  MONTH_YEAR: 'MMMM yyyy',
  YEAR: 'yyyy',
  WEEKDAY: 'EEEE',
  SHORT_WEEKDAY: 'EEE'
} as const

/**
 * Timezone utilities
 */
export const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const formatInTimezone = (
  date: string | Date,
  timezone: string,
  pattern: string = 'yyyy-MM-dd HH:mm:ss'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(dateObj)
  } catch (error) {
    return formatDate(date, pattern)
  }
}