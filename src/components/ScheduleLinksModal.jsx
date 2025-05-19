import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

// Common styles as constants
const truncatedTextStyle = {
  overflow: "hidden", 
  textOverflow: "ellipsis", 
  whiteSpace: "nowrap"
};

const ScheduleLinksModal = ({ isOpen, onClose, onSave }) => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
    }
  }, [isOpen]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.SCHEDULE_LINKS, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedule links');
      }
      
      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      console.error('Error fetching schedule links:', err);
      setError(err.message || 'Failed to load schedule links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      setError(null);
      const response = await fetch(`${API_ENDPOINTS.SCHEDULE_LINKS}/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete schedule link');
      }
      
      setLinks(links.filter(link => link._id !== linkId));
    } catch (err) {
      console.error('Error deleting schedule link:', err);
      setError(err.message || 'Failed to delete schedule link');
    }
  };

  const handleAddLink = () => {
    setSelectedLink(null);
    setIsAddModalOpen(true);
  };

  const handleEditLink = (link) => {
    setSelectedLink(link);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedLink(null);
  };

  const handleSaveLink = async (linkData) => {
    try {
      fetchLinks(); // Refresh the list after save
      setIsAddModalOpen(false);
      onSave?.();
    } catch (err) {
      console.error('Error saving schedule link:', err);
      setError(err.message || 'Failed to save schedule link');
    }
  };

  const copyToClipboard = (text, linkId) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedLinkId(linkId);
        setTimeout(() => setCopiedLinkId(null), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Manage Schedule Links</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading schedule links...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <button
                  onClick={handleAddLink}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                >
                  + Add New Link
                </button>
              </div>

              {links.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No schedule links created yet. Create your first link to share with others.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <colgroup>
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '25%' }} />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slug
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Meeting Length
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Max Uses
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiration
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {links.map((link) => (
                        <tr key={link._id}>
                          <td className="px-6 py-4">
                            <div style={{ maxWidth: "200px" }}>
                              <div 
                                className="text-sm font-medium text-gray-900" 
                                style={truncatedTextStyle} 
                                title={link.slug}
                              >
                                {link.slug}
                              </div>
                              <div className="flex items-center mt-1">
                                <a 
                                  href={`${window.location.origin}/schedule/${link.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center flex-grow" 
                                  style={truncatedTextStyle} 
                                  title={`${window.location.origin}/schedule/${link.slug}`}
                                >
                                  <span className="truncate">{`${window.location.origin}/schedule/${link.slug}`}</span>
                                  <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/schedule/${link.slug}`, link._id)}
                                  className="ml-2 p-1 text-gray-500 hover:text-indigo-600 flex-shrink-0"
                                  title="Copy link to clipboard"
                                >
                                  {copiedLinkId === link._id ? (
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {link.meetingLength} min
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {link.maxUses ? link.maxUses : 'Unlimited'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {link.expirationDate 
                              ? new Date(link.expirationDate).toLocaleDateString() 
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditLink(link)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {isAddModalOpen && (
        <AddLinkModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onSave={handleSaveLink}
          link={selectedLink}
        />
      )}
    </div>
  );
};

const AddLinkModal = ({ isOpen, onClose, onSave, link = null }) => {
  const [formData, setFormData] = useState({
    slug: '',
    meetingLength: 30,
    maxUses: '',
    expirationDate: '',
    maxDaysInAdvance: 30,
    customQuestions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (link) {
      setFormData({
        slug: link.slug || '',
        meetingLength: link.meetingLength || 30,
        maxUses: link.maxUses || '',
        expirationDate: link.expirationDate ? new Date(link.expirationDate).toISOString().split('T')[0] : '',
        maxDaysInAdvance: link.maxDaysInAdvance || 30,
        customQuestions: link.customQuestions || []
      });
    }
  }, [link]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      customQuestions: [...formData.customQuestions, '']
    });
  };

  const handleQuestionChange = (index, value) => {
    const updatedQuestions = [...formData.customQuestions];
    updatedQuestions[index] = value;
    setFormData({
      ...formData,
      customQuestions: updatedQuestions
    });
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = [...formData.customQuestions];
    updatedQuestions.splice(index, 1);
    setFormData({
      ...formData,
      customQuestions: updatedQuestions
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        meetingLength: Number(formData.meetingLength),
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        maxDaysInAdvance: Number(formData.maxDaysInAdvance)
      };

      const url = link?._id 
        ? `${API_ENDPOINTS.SCHEDULE_LINKS}/${link._id}` 
        : API_ENDPOINTS.SCHEDULE_LINKS;
      
      const method = link?._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.detail || 'Failed to save schedule link');
      }

      onSave(await response.json());
    } catch (err) {
      console.error('Error saving schedule link:', err);
      setError(err.message || 'Failed to save schedule link');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {link ? 'Edit Schedule Link' : 'Create New Schedule Link'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  Slug (short label for the link) *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  required
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g., coffee-chat"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {formData.slug && (
                  <p className="mt-1 text-xs text-gray-500">
                    Link will be: {window.location.origin}/schedule/{formData.slug}
                  </p>
                )}
              </div>

              {/* Meeting Length */}
              <div>
                <label htmlFor="meetingLength" className="block text-sm font-medium text-gray-700">
                  Meeting Length (minutes) *
                </label>
                <input
                  type="number"
                  id="meetingLength"
                  name="meetingLength"
                  required
                  min="5"
                  value={formData.meetingLength}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Max Days in Advance */}
              <div>
                <label htmlFor="maxDaysInAdvance" className="block text-sm font-medium text-gray-700">
                  Max Days in Advance
                </label>
                <input
                  type="number"
                  id="maxDaysInAdvance"
                  name="maxDaysInAdvance"
                  min="1"
                  value={formData.maxDaysInAdvance}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  How many days in advance can people book a meeting
                </p>
              </div>

              {/* Max Uses */}
              <div>
                <label htmlFor="maxUses" className="block text-sm font-medium text-gray-700">
                  Max Uses (Optional)
                </label>
                <input
                  type="number"
                  id="maxUses"
                  name="maxUses"
                  min="1"
                  value={formData.maxUses}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for unlimited uses
                </p>
              </div>

              {/* Expiration Date */}
              <div>
                <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  id="expirationDate"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Custom Questions */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Questions (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200 transition-colors"
                  >
                    + Add Question
                  </button>
                </div>
                {formData.customQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-1">
                    Add questions that will be asked when someone books a meeting
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.customQuestions.map((question, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => handleQuestionChange(index, e.target.value)}
                          placeholder="Enter your question here"
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : (link ? 'Save Changes' : 'Create Link')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleLinksModal; 