'use client';
import { Search } from 'lucide-react';
import { useState, forwardRef } from 'react';
export const SearchBar = forwardRef(({ onSearch, placeholder = "Search issues...", onEscape }, ref) => {
    const [query, setQuery] = useState('');
    const handleSearch = (value) => {
        setQuery(value);
        onSearch === null || onSearch === void 0 ? void 0 : onSearch(value);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onEscape === null || onEscape === void 0 ? void 0 : onEscape();
        }
    };
    return (<div className="w-full">
        <div className="relative">
          <input ref={ref} type="text" value={query} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"/>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"/>
        </div>
      </div>);
});
SearchBar.displayName = 'SearchBar';
