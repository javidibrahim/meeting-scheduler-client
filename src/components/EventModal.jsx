import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const EventModal = ({ isOpen, onClose, events, selectedDate }) => {
  if (!isOpen) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Events for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Events List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No events for this day</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 mb-2">{event.summary}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="flex items-center">
                      <span className="font-medium w-20">Start:</span>
                      {formatDate(event.start)}
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium w-20">End:</span>
                      {formatDate(event.end)}
                    </p>
                    {event.description && (
                      <p className="flex items-start mt-2">
                        <span className="font-medium w-20">Description:</span>
                        <span className="flex-1">{event.description}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal; 