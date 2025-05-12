import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

// Helper function to check if two time windows overlap
const doWindowsOverlap = (window1, window2) => {
  if (window1.weekday !== window2.weekday) return false;
  
  const start1 = new Date(`2000-01-01T${window1.start_time}`);
  const end1 = new Date(`2000-01-01T${window1.end_time}`);
  const start2 = new Date(`2000-01-01T${window2.start_time}`);
  const end2 = new Date(`2000-01-01T${window2.end_time}`);
  
  return (start1 < end2 && end1 > start2);
};

// Helper function to check if a new window overlaps with any existing windows
const hasOverlap = (newWindow, existingWindows) => {
  return existingWindows.some(window => doWindowsOverlap(newWindow, window));
};

const AvailabilityModal = ({ isOpen, onClose, onSave }) => {
  const [windows, setWindows] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchExistingAvailability();
    }
  }, [isOpen]);

  const fetchExistingAvailability = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.AVAILABILITY, {
        credentials: 'include'
      });
      const responseData = await response.json();
      if (response.ok) {
        if (responseData.windows && responseData.windows.length > 0) {
          setWindows(responseData.windows.map(w => ({
            _id: w._id,
            weekday: w.weekday,
            start_time: w.start_time,
            end_time: w.end_time
          })));
        } else {
          setWindows([]);
        }
      } else {
        const errorMessage = typeof responseData.detail === 'string'
          ? responseData.detail
          : JSON.stringify(responseData.detail || responseData || 'Failed to load availability');
        throw new Error(errorMessage);
      }
    } catch (err) {
      setError(String(err?.message || err || 'Unknown error'));
      console.error('Failed to fetch availability:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWindow = () => {
    // Start with a default window
    let newWindow = { weekday: 'monday', start_time: '09:00', end_time: '17:00' };
    
    // Try to find a non-overlapping time slot
    const weekdayWindows = windows.filter(w => w.weekday === newWindow.weekday);
    
    if (weekdayWindows.length > 0) {
      // If we have windows on Monday already, try other days of the week
      for (const day of WEEKDAYS) {
        const dayWindows = windows.filter(w => w.weekday === day.value);
        if (dayWindows.length === 0) {
          // Found a day with no windows
          newWindow.weekday = day.value;
          break;
        }
      }
      
      // If all days have at least one window, try to find a time slot on the same day
      if (hasOverlap(newWindow, windows)) {
        // Try different time slots (e.g., evening hours)
        const timeSlots = [
          { start: '18:00', end: '22:00' },
          { start: '13:00', end: '17:00' },
          { start: '09:00', end: '12:00' }
        ];
        
        let foundSlot = false;
        for (const slot of timeSlots) {
          const testWindow = { 
            ...newWindow, 
            start_time: slot.start, 
            end_time: slot.end 
          };
          
          if (!hasOverlap(testWindow, windows)) {
            newWindow = testWindow;
            foundSlot = true;
            break;
          }
        }
        
        // If still no good slot, just increment the day
        if (!foundSlot) {
          const dayIndex = WEEKDAYS.findIndex(d => d.value === newWindow.weekday);
          const nextDayIndex = (dayIndex + 1) % WEEKDAYS.length;
          newWindow.weekday = WEEKDAYS[nextDayIndex].value;
        }
      }
    }
    
    // Final check for overlaps
    if (hasOverlap(newWindow, windows)) {
      setError('Could not find a non-overlapping time slot. Please manually adjust a new window.');
      // Add it anyway for the user to adjust
      setWindows([...windows, newWindow]);
      return;
    }
    
    setWindows([...windows, newWindow]);
    setError(null);
  };

  const handleRemoveWindow = async (window) => {
    if (window._id) {
      try {
        const response = await fetch(`${API_ENDPOINTS.AVAILABILITY}/${window._id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const responseData = await response.json();
        if (!response.ok) {
          const errorMessage = typeof responseData.detail === 'string'
            ? responseData.detail
            : JSON.stringify(responseData.detail || responseData || 'Failed to delete window');
          throw new Error(errorMessage);
        }
      } catch (err) {
        setError(String(err?.message || err || 'Unknown error'));
        console.error('Error deleting window:', err);
        return;
      }
    }
    setWindows(windows.filter(w => w !== window));
    setError(null);
  };

  const handleWindowChange = (index, field, value) => {
    const newWindows = [...windows];
    const updatedWindow = { ...newWindows[index], [field]: value };
    
    // Check for overlaps with other windows
    const otherWindows = newWindows.filter((_, i) => i !== index);
    if (hasOverlap(updatedWindow, otherWindows)) {
      setError('This time slot overlaps with another window');
      return;
    }
    
    newWindows[index] = updatedWindow;
    setWindows(newWindows);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const newWindows = windows.filter(w => !w._id);
      if (newWindows.length === 0) {
        onClose();
        return;
      }
      const response = await fetch(API_ENDPOINTS.AVAILABILITY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ windows: newWindows }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const errorMessage = typeof responseData.detail === 'string'
          ? responseData.detail
          : JSON.stringify(responseData.detail || responseData || 'Failed to save availability');
        throw new Error(errorMessage);
      }
      onSave?.();
      onClose();
    } catch (err) {
      setError(String(err?.message || err || 'Unknown error'));
      console.error('Error saving availability:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Manage Your Availability</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading availability...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600">{String(error)}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {windows.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No availability windows set. Add your first time slot below.</p>
                  ) : (
                    windows.map((window, index) => (
                      <div key={window._id || index} className="flex items-end space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Day
                          </label>
                          <select
                            value={window.weekday}
                            onChange={(e) => handleWindowChange(index, 'weekday', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            {WEEKDAYS.map(day => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={window.start_time}
                            onChange={(e) => handleWindowChange(index, 'start_time', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={window.end_time}
                            onChange={(e) => handleWindowChange(index, 'end_time', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveWindow(window)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={handleAddWindow}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    + Add Another Time Slot
                  </button>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save New Windows'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;
