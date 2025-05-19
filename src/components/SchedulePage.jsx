import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../config';
import { useAuth } from '../context/AuthContext';

const SchedulePage = () => {
  const { slug } = useParams();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedulingLink, setSchedulingLink] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [availabilityWindows, setAvailabilityWindows] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    linkedin: '',
    answers: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSchedulingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch scheduling link data using the authenticated API client
        const response = await api.get(`${API_ENDPOINTS.PUBLIC_SCHEDULE}/${slug}`);
        
        if (!response.data || response.data.error) {
          throw new Error(response.data?.error || 'Failed to fetch scheduling link');
        }
        
        console.log("Received data from server:", {
          linkFound: !!response.data.link,
          advisorFound: !!response.data.advisor,
          availabilityCount: response.data.availability?.length || 0,
          eventsCount: response.data.events?.length || 0
        });
        
        const linkData = response.data.link;
        setSchedulingLink(linkData);
        
        // Set up form data with customQuestions from the link
        setFormData({
          email: '',
          linkedin: '',
          answers: linkData.customQuestions?.map((question, index) => ({ 
            question: question,  // Use the actual question text
            answer: '' 
          })) || []
        });
        
        // Advisor data should be included in the response
        setAdvisor(response.data.advisor);
        
        // Log and process availability windows
        const availabilityData = response.data.availability || [];
        
        // If no availability windows, show a specific error
        if (availabilityData.length === 0) {
          setError('No availability windows have been set up for this advisor.');
          setLoading(false);
          return;
        }
        
        // Set availability windows
        setAvailabilityWindows(availabilityData);
        
        // Log and process upcoming events
        const eventsData = response.data.events || [];
        
        // Set all events (both calendar events and scheduled events)
        setUpcomingEvents(eventsData);
        
        // Compute available slots - using correct field name meetingLength
        computeAvailableSlots(
          availabilityData, 
          eventsData,
          linkData.meetingLength,
          linkData.maxDaysInAdvance || 14 // Pass maxDaysInAdvance directly from linkData
        );
        
      } catch (err) {
        console.error('Error fetching scheduling data:', err);
        // More specific error details
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server error details:', {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });
          
          // Check for specific error cases
          const errorDetail = err.response.data?.detail;
          if (errorDetail && errorDetail.includes("maximum number of uses")) {
            setError("This scheduling link has reached its maximum allowed number of bookings and is no longer available.");
          } else if (errorDetail && errorDetail.includes("expired")) {
            setError("This scheduling link has expired and is no longer available.");
          } else {
            setError(errorDetail || err.message || 'Failed to load scheduling information');
          }
        } else if (err.request) {
          // The request was made but no response was received
          console.error('No response received from server');
          setError('Could not connect to the server. Please try again later.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(err.message || 'Failed to load scheduling information');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedulingData();
  }, [slug, api]);
  
  const computeAvailableSlots = (availability, events, durationMinutes, maxDaysInAdvance) => {
    // Create window of potential slots limited by maxDaysInAdvance
    const slots = [];
    const now = new Date();
    
    // Use maxDaysInAdvance from the scheduling link, default to 14 days
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxDaysInAdvance);
        
    // Check if we have valid availability data
    if (!availability || availability.length === 0) {
      console.error("No availability windows to process");
      setAvailableSlots([]);
      return;
    }
    
    // For each day in the available window
    for (let day = new Date(now); day <= maxDate; day.setDate(day.getDate() + 1)) {
      const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Get day name to match with weekday field in database
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Find availability for this day of week by name (not number)
      const dayAvailability = availability.filter(window => 
        window.weekday && window.weekday.toLowerCase() === dayName
      );
      
      if (dayAvailability.length === 0) {
        // Silently skip days with no availability
        continue;
      }
            
      // For each availability window on this day
      dayAvailability.forEach(window => {
        // Check if start_time and end_time exist
        if (!window.start_time || !window.end_time) {
          console.error(`Invalid availability window: missing time fields`, window);
          return;
        }
        
        const [startHour, startMinute] = window.start_time.split(':').map(Number);
        const [endHour, endMinute] = window.end_time.split(':').map(Number);
        
        // Create slots within this window
        const slotDate = new Date(day);
        slotDate.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(day);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // Create slots at exact intervals
        const slotInterval = Math.min(30, durationMinutes); // Use 30 min or meeting duration if shorter
        
        // Make a copy of the initial time for debugging
        const initialTime = new Date(slotDate);
        console.log(`Starting slots at: ${initialTime.toLocaleTimeString()}, ending at: ${endTime.toLocaleTimeString()}`);
        
        // Reset slotDate to the exact start time for this window
        slotDate.setHours(startHour, startMinute, 0, 0);
        
        while (slotDate < endTime) {
          const slotEndTime = new Date(slotDate);
          slotEndTime.setMinutes(slotEndTime.getMinutes() + durationMinutes);
          
          // Only create a slot if it fits completely within the availability window
          if (slotEndTime <= endTime) {
            // Skip slots in the past
            if (slotDate <= now) {
              slotDate.setMinutes(slotDate.getMinutes() + slotInterval);
              continue;
            }
            
            // Check for conflicts with existing events
            const hasConflict = events.some(event => {
              // Check if event object has the right fields
              if (!event.start_time || !event.end_time) {
                console.warn("Event missing start_time or end_time:", event);
                return false;
              }
              
              // Convert MongoDB ISO date strings to Date objects
              const eventStart = new Date(event.start_time);
              const eventEnd = new Date(event.end_time);
              
              // Special case for scheduled events - do exact time comparison
              if (event.source === 'scheduled_events') {
                // For scheduled events, do exact time match
                const eventHours = eventStart.getHours();
                const eventMinutes = eventStart.getMinutes();
                const slotHours = slotDate.getHours();
                const slotMinutes = slotDate.getMinutes();
                
                // If the hours and minutes match exactly, it's a conflict
                if (eventHours === slotHours && eventMinutes === slotMinutes) {
                  console.log(`Exact match conflict with scheduled meeting at ${eventStart.toLocaleTimeString()}`);
                  return true;
                }
              }
              
              // Use timestamps for comparison to avoid timezone issues
              const slotTimestamp = slotDate.getTime();
              const slotEndTimestamp = slotEndTime.getTime();
              const eventStartTimestamp = eventStart.getTime();
              const eventEndTimestamp = eventEnd.getTime();
              
              // Improved overlap check
              let overlap = false;
              
              // Check all overlap cases
              if (
                // Case 1: Slot starts during the event
                (slotTimestamp >= eventStartTimestamp && slotTimestamp < eventEndTimestamp) ||
                // Case 2: Slot ends during the event
                (slotEndTimestamp > eventStartTimestamp && slotEndTimestamp <= eventEndTimestamp) ||
                // Case 3: Slot completely contains the event
                (slotTimestamp <= eventStartTimestamp && slotEndTimestamp >= eventEndTimestamp)
              ) {
                overlap = true;
              }
              
              return overlap;
            });
            
            if (!hasConflict) {
              slots.push({
                start: new Date(slotDate),
                end: new Date(slotEndTime)
              });
            }
          }
          
          // Move to next slot
          slotDate.setMinutes(slotDate.getMinutes() + slotInterval);
        }
      });
    }
    
    setAvailableSlots(slots);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAnswerChange = (questionId, value) => {
    setFormData(prev => ({
      ...prev,
      answers: prev.answers.map(a => 
        a.question === questionId ? { ...a, answer: value } : a  // Match by question text
      )
    }));
  };
  
  const handleSlotSelect = (slot) => {
    // Log both local time and UTC time for debugging
    console.log(`Selected slot (local): ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`);
    console.log(`Selected slot (UTC): ${slot.start.toUTCString()}`);
    setSelectedSlot(slot);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    
    if (!formData.email || !formData.linkedin) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate all questions are answered
    const unansweredQuestions = formData.answers.filter(a => !a.answer);
    if (unansweredQuestions.length > 0) {
      setError('Please answer all questions');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format the date explicitly in local timezone to ensure what we see is what we book
      const year = selectedSlot.start.getFullYear();
      const month = String(selectedSlot.start.getMonth() + 1).padStart(2, '0');
      const day = String(selectedSlot.start.getDate()).padStart(2, '0');
      const hours = String(selectedSlot.start.getHours()).padStart(2, '0');
      const minutes = String(selectedSlot.start.getMinutes()).padStart(2, '0');
      const seconds = '00';
      
      // Format: YYYY-MM-DDTHH:MM:SS (local time, no timezone info)
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      
      console.log(`Booking meeting at: ${formattedDate} (${selectedSlot.start.toLocaleTimeString()})`);
      
      // Use the authenticated API client
      const response = await api.post(`${API_ENDPOINTS.PUBLIC_SCHEDULE}/schedule/book`, {
        scheduling_link_id: schedulingLink._id,
        scheduled_for: formattedDate,
        duration_minutes: schedulingLink.meetingLength,
        email: formData.email,
        linkedin: formData.linkedin,
        answers: formData.answers
      });
      
      if (response.data.success) {
        setSuccess(true);
      } else {
        throw new Error(response.data.error || 'Failed to book meeting');
      }
    } catch (err) {
      console.error('Error booking meeting:', err);
      setError(err.message || 'Failed to book meeting');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scheduling information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Scheduling Unavailable</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-500 text-white py-2 px-6 rounded-md hover:bg-indigo-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (!schedulingLink) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Not Found</h2>
          <p className="text-gray-600 mb-6">This scheduling link doesn't exist or has expired.</p>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Meeting Scheduled!</h2>
          <p className="text-gray-600 mb-6">
            Your meeting with {advisor?.name} has been scheduled successfully. You'll receive an email confirmation shortly.
          </p>
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex flex-col items-start text-left mb-4">
              <span className="text-sm text-gray-500">Date & Time</span>
              <span className="font-medium">
                {selectedSlot?.start.toLocaleDateString()} at {selectedSlot?.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm text-gray-500">Duration</span>
              <span className="font-medium">{schedulingLink.meetingLength} minutes</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Group available slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const dateStr = slot.start.toLocaleDateString();
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(slot);
    return acc;
  }, {});
  
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 py-6 px-6 md:px-10">
            <h1 className="text-2xl font-bold text-white">{advisor?.name}'s Scheduling Page</h1>
            <p className="text-indigo-100 mt-1">Book a {schedulingLink.meetingLength}-minute meeting</p>
            <p className="text-indigo-100 mt-1 text-sm">Available times shown for the next {schedulingLink.maxDaysInAdvance} days</p>
          </div>
          
          <div className="p-6 md:p-10">
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left column - Time slots */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Select a Time</h2>
                  
                  {Object.keys(slotsByDate).length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md text-center">
                      <p className="text-gray-500">No available time slots in the next {schedulingLink?.maxDaysInAdvance || 14} days.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                      {Object.entries(slotsByDate).map(([date, slots]) => (
                        <div key={date} className="border-b border-gray-200 pb-4 last:border-0">
                          <h3 className="font-medium text-gray-800 mb-3">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {slots.map((slot, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors
                                  ${selectedSlot === slot 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                onClick={() => handleSlotSelect(slot)}
                              >
                                {slot.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Right column - Contact info & questions */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Information</h2>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="linkedin">
                        LinkedIn Profile *
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        required
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                    
                    {schedulingLink.customQuestions && schedulingLink.customQuestions.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-medium text-gray-800 mb-3">Additional Information</h3>
                        
                        <div className="space-y-4">
                          {schedulingLink.customQuestions.map((question, index) => {
                            const answerObj = formData.answers.find(a => a.question === question);
                            
                            return (
                              <div key={index}>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`question-${index}`}>
                                  {question} *
                                </label>
                                <input
                                  type="text"
                                  id={`question-${index}`}
                                  required
                                  value={answerObj?.answer || ''}
                                  onChange={(e) => handleAnswerChange(question, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={!selectedSlot || submitting}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
                          ${selectedSlot && !submitting
                            ? 'bg-indigo-600 hover:bg-indigo-700' 
                            : 'bg-indigo-300 cursor-not-allowed'
                          }`}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Scheduling Meeting...
                          </span>
                        ) : (
                          'Schedule Meeting'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;