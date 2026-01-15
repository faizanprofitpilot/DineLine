/**
 * Utility functions for checking restaurant operating hours
 */

/**
 * Check if restaurant is currently open based on hours and timezone
 * @param hoursOpen - Opening time (HH:MM format, e.g., "09:00")
 * @param hoursClose - Closing time (HH:MM format, e.g., "17:00")
 * @param timezone - Timezone (IANA format, e.g., "America/New_York")
 * @returns boolean - true if restaurant is currently open
 */
export function isRestaurantOpen(
  hoursOpen: string,
  hoursClose: string,
  timezone: string = 'America/New_York'
): boolean {
  try {
    // Get current time in restaurant's timezone
    const now = new Date();
    const restaurantTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Parse hours (handle both "09:00" and "09:00:00" formats)
    const [openHour, openMinute] = hoursOpen.split(':').map(Number);
    const [closeHour, closeMinute] = hoursClose.split(':').map(Number);
    
    // Create time objects for today
    const openTime = new Date(restaurantTime);
    openTime.setHours(openHour, openMinute, 0, 0);
    
    const closeTime = new Date(restaurantTime);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    
    // Handle case where closing time is next day (e.g., 23:00 - 02:00)
    if (closeTime <= openTime) {
      closeTime.setDate(closeTime.getDate() + 1);
    }
    
    // Check if current time is between open and close
    return restaurantTime >= openTime && restaurantTime < closeTime;
  } catch (error) {
    console.error('[Hours Check] Error checking restaurant hours:', error);
    // Default to open if error occurs (fail open)
    return true;
  }
}

/**
 * Format hours for display (e.g., "9:00 AM - 5:00 PM")
 * @param hoursOpen - Opening time (HH:MM format)
 * @param hoursClose - Closing time (HH:MM format)
 * @returns Formatted hours string
 */
export function formatHours(hoursOpen: string, hoursClose: string): string {
  try {
    const formatTime = (time: string): string => {
      const [hour, minute] = time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const displayMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMinute} ${period}`;
    };
    
    return `${formatTime(hoursOpen)} - ${formatTime(hoursClose)}`;
  } catch (error) {
    console.error('[Hours Format] Error formatting hours:', error);
    return `${hoursOpen} - ${hoursClose}`;
  }
}

/**
 * Get hours status message
 * @param hoursOpen - Opening time
 * @param hoursClose - Closing time
 * @param timezone - Timezone
 * @param afterHoursTakeOrders - Whether restaurant takes orders after hours
 * @returns Status message string
 */
export function getHoursStatusMessage(
  hoursOpen: string,
  hoursClose: string,
  timezone: string = 'America/New_York',
  afterHoursTakeOrders: boolean = true
): string {
  const isOpen = isRestaurantOpen(hoursOpen, hoursClose, timezone);
  const formattedHours = formatHours(hoursOpen, hoursClose);
  
  if (isOpen) {
    return `We're open ${formattedHours}. How can I help you?`;
  } else if (afterHoursTakeOrders) {
    return `We're currently closed (we're open ${formattedHours}), but I can still take your order for tomorrow.`;
  } else {
    return `We're currently closed. Our hours are ${formattedHours}. Please call back during business hours.`;
  }
}

