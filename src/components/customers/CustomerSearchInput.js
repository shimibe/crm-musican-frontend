import React, { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';

/**
 * Reusable customer search input with server-side search and inline "add new" support.
 *
 * Props:
 *   searchValue   {string}   - current text shown in the input
 *   selectedId    {string}   - selected customer ID (falsy = nothing selected)
 *   onSearchChange(term)     - called when the user types (clear selectedId in parent)
 *   onSelect(customer)       - called with { id, name } when a customer is chosen or created
 *   placeholder   {string}
 *   className     {string}
 */
const CustomerSearchInput = ({
  searchValue = '',
  selectedId = '',
  onSearchChange,
  onSelect,
  placeholder = 'חפש לקוח...',
  className = '',
}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    // Don't search when a customer is already selected or the box is empty
    if (selectedId || !searchValue.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await api.get('/customers', {
          params: { search: searchValue.trim(), limit: 20 },
        });
        setResults(response.data.customers || response.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchValue, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddNew = async () => {
    const name = searchValue.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const response = await api.post('/customers', { name });
      const newCustomer = response.data;
      onSelect({ id: newCustomer.id, name: newCustomer.name });
      setResults([]);
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('שגיאה ביצירת לקוח');
    } finally {
      setAdding(false);
    }
  };

  const showDropdown = !selectedId && searchValue.trim();

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      {showDropdown && (
        <div className="absolute z-20 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-auto mt-1">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">מחפש...</div>
          ) : (
            <>
              {results.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">לא נמצאו לקוחות</div>
              )}
              {results.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => { onSelect(customer); setResults([]); }}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                >
                  {customer.name}
                  {customer.phone && (
                    <span className="text-gray-400 mr-2 text-xs">{customer.phone}</span>
                  )}
                </div>
              ))}
              <div
                onClick={handleAddNew}
                className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600"
              >
                {adding ? 'מוסיף...' : `+ הוסף לקוח חדש: "${searchValue.trim()}"`}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchInput;
