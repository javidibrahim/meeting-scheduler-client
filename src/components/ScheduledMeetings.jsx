import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

const ScheduledMeetings = ({ isOpen, onClose }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [formattedAnswers, setFormattedAnswers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchMeetings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (meetingDetails) {
      matchQuestionsWithAnswers();
    }
  }, [meetingDetails]);

  const matchQuestionsWithAnswers = () => {
    // Skip if no meeting details
    if (!meetingDetails) {
      return;
    }
    
    const answers = meetingDetails.answers || [];
    
    // If there are no answers, set an empty array
    if (answers.length === 0) {
      setFormattedAnswers([]);
      return;
    }
    
    // Check if link details and customQuestions exist
    const linkDetails = meetingDetails.link_details || {};
    const customQuestions = linkDetails.customQuestions || [];
    
    // Format the answers depending on the format of customQuestions
    // customQuestions can be either an array of strings or an array of objects
    const formatted = answers.map((answer, index) => {
      // Get the question from customQuestions if available
      let questionText = answer.question;
      let isRequired = false;
      
      if (customQuestions[index]) {
        // Check if customQuestions is an array of strings or objects
        if (typeof customQuestions[index] === 'string') {
          questionText = customQuestions[index];
        } else if (typeof customQuestions[index] === 'object') {
          questionText = customQuestions[index].question || answer.question;
          isRequired = !!customQuestions[index].required;
        }
      }
      
      return {
        question: questionText,
        answer: answer.answer,
        required: isRequired,
        questionId: `question-${index}`
      };
    });
    
    setFormattedAnswers(formatted);
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.MEETINGS, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      
      const data = await response.json();
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('Failed to load scheduled meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingDetails = async (meetingId) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(API_ENDPOINTS.MEETING_DETAILS(meetingId), {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch meeting details');
      }
      
      const data = await response.json();
      setMeetingDetails(data);
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      setError('Failed to load meeting details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    fetchMeetingDetails(meeting.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">Scheduled Meetings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Meetings List Panel - Reduced width */}
            <div className="w-1/4 border-r border-gray-200 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : error ? (
                <div className="p-4 text-red-500">{error}</div>
              ) : meetings.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">No meetings scheduled yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {meetings.map(meeting => (
                    <div
                      key={meeting.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMeeting?.id === meeting.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                      onClick={() => handleSelectMeeting(meeting)}
                    >
                      <p className="font-medium text-gray-800 truncate">{meeting.client_email}</p>
                      <p className="text-sm text-indigo-600 mt-1">
                        {formatDate(meeting.start_time)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                      </p>
                      {meeting.has_enrichment && (
                        <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Enhanced
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meeting Details Panel - Increased width */}
            <div className="w-3/4 overflow-y-auto p-6">
              {selectedMeeting ? (
                loadingDetails ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                ) : meetingDetails ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-2xl font-semibold text-gray-800 mb-2">Meeting with {meetingDetails.client_email}</h3>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center text-indigo-600">
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(meetingDetails.start_time)}</span>
                        </div>
                        <div className="flex items-center text-indigo-600">
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(meetingDetails.start_time)} - {formatTime(meetingDetails.end_time)}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-600">{meetingDetails.duration_minutes} minutes</span>
                        </div>
                        
                        {meetingDetails.link_details && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <a 
                              href={`${window.location.origin}/schedule/${meetingDetails.link_details.slug}`} 
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="text-indigo-600 font-medium hover:underline"
                            >
                              Booked via: {meetingDetails.link_details.slug}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client info */}
                        <div className="col-span-2 md:col-span-1">
                          {meetingDetails.client_linkedin && (
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg className="w-4 h-4 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                </svg>
                                LinkedIn Profile
                              </h4>
                              <a 
                                href={meetingDetails.client_linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center bg-blue-50 rounded-md p-3 transition-colors hover:bg-blue-100"
                              >
                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                </svg>
                                View LinkedIn Profile
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="col-span-2 md:col-span-1">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Contact Email
                          </h4>
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-gray-800">{meetingDetails.client_email}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Client Answers Section - Expanded */}
                      {formattedAnswers && formattedAnswers.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center border-b pb-2">
                            <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Client Responses
                          </h4>
                          <div className="space-y-4">
                            {formattedAnswers.map((answer, index) => (
                              <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                  <p className="font-medium text-gray-800">{answer.question}</p>
                                  {answer.required && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Required</span>
                                  )}
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-gray-700 whitespace-pre-wrap">{answer.answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Meeting Insights Section - Replaces Enrichment */}
                      {meetingDetails.enrichment ? (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center border-b pb-2">
                            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Meeting Insights
                          </h4>
                          
                          {meetingDetails.enrichment.linkedin_summary && (
                            <div className="mb-4">
                              <div className="bg-blue-50 rounded-md overflow-hidden">
                                <div className="bg-blue-100 px-4 py-2 flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                  </svg>
                                  <p className="font-medium text-blue-700">LinkedIn Summary</p>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-gray-700 whitespace-pre-wrap">{meetingDetails.enrichment.linkedin_summary}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {meetingDetails.enrichment.augmented_note && (
                            <div className="mb-4">
                              <div className="bg-green-50 rounded-md overflow-hidden">
                                <div className="bg-green-100 px-4 py-2 flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="font-medium text-green-700">Augmented Notes</p>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-gray-700 whitespace-pre-wrap">{meetingDetails.enrichment.augmented_note}</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {meetingDetails.enrichment.enriched_at && `Generated on ${new Date(meetingDetails.enrichment.enriched_at).toLocaleString()}`}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center border-b pb-2">
                            <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Meeting Insights
                          </h4>
                          <div className="bg-gray-50 rounded-md p-4 flex flex-col items-center justify-center text-gray-400 h-40">
                            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>Additional insights will appear here once the meeting data is processed</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Failed to load meeting details</p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Select a meeting to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledMeetings; 