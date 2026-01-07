import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Play, 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Database, 
  Code,
  Globe,
  Lock,
  Search,
  Trash2
} from 'lucide-react';

/**
 * UTILITY FUNCTIONS
 */

// Robust CSV Parser that handles double quotes
const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  
  // Helper to parse a single line respecting quotes
  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        // End of cell: trim and strip outer quotes, unescape double double-quotes
        values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    // Push last value
    values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return values;
  };

  // Parse headers
  const headers = parseLine(lines[0]);
  
  // Parse rows
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      // Clean key names too just in case
      const cleanKey = h.replace(/^"|"$/g, '').trim();
      obj[cleanKey] = values[i] || '';
    });
    return obj;
  });
};

// Flatten Swagger Schema to simple field list for the UI
const extractFieldsFromSchema = (schema, definitions) => {
  if (!schema) return [];
  let properties = {};
  let requiredFields = [];
  
  // Handle refs roughly
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (definitions && definitions[refName]) {
      properties = definitions[refName].properties || {};
      requiredFields = definitions[refName].required || [];
    }
  } else {
    properties = schema.properties || {};
    requiredFields = schema.required || [];
  }

  return Object.keys(properties).map(key => ({
    name: key,
    type: properties[key].type || 'string',
    required: requiredFields.includes(key),
    description: properties[key].description || ''
  }));
};

/**
 * COMPONENTS
 */

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ method }) => {
  const colors = {
    get: 'bg-blue-100 text-blue-700',
    post: 'bg-green-100 text-green-700',
    put: 'bg-orange-100 text-orange-700',
    delete: 'bg-red-100 text-red-700',
    patch: 'bg-yellow-100 text-yellow-700'
  };
  return (
    <span className={`uppercase px-2 py-0.5 rounded text-xs font-bold ${colors[method.toLowerCase()] || 'bg-slate-100'}`}>
      {method}
    </span>
  );
};

// NEW: Searchable Select Component
const SearchableSelect = ({ options, value, onChange, placeholder = "Select option..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.subLabel.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="w-full p-2 border border-slate-300 rounded-md text-sm flex justify-between items-center cursor-pointer bg-white hover:border-blue-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400"}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
               <Badge method={selectedOption.method} />
               <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
             <div className="relative">
                <Search size={14} className="absolute left-2 top-2 text-slate-400"/>
                <input
                  type="text"
                  className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  placeholder="Search API..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()} 
                />
             </div>
          </div>
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">No results found</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0 ${value === opt.value ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div className="shrink-0">
                  <Badge method={opt.method} />
                </div>
                <div className="flex flex-col overflow-hidden">
                   <span className="truncate font-medium text-slate-700">{opt.label}</span>
                   <span className="truncate text-[10px] text-slate-400">{opt.subLabel}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('setup'); // setup, manual, batch
  const [specInput, setSpecInput] = useState('');
  const [parsedSpec, setParsedSpec] = useState(null);
  const [error, setError] = useState('');
  
  // Environment Config
  const [config, setConfig] = useState({
    baseUrl: 'https://api.example.com',
    token: '',
    headers: []
  });

  // Manual Test State
  const [manualSearch, setManualSearch] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [formData, setFormData] = useState({});
  const [manualResponse, setManualResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // Batch Test State
  const [batchFile, setBatchFile] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);

  // --- HANDLERS ---

  const handleSpecParse = () => {
    try {
      const json = JSON.parse(specInput);
      
      // Basic validation
      if (!json.paths) throw new Error("Invalid OpenAPI/Swagger Spec: Missing 'paths'");
      
      // Process endpoints into a flat list
      const endpoints = [];
      Object.keys(json.paths).forEach(path => {
        Object.keys(json.paths[path]).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            const details = json.paths[path][method];
            endpoints.push({
              id: `${method}-${path}`,
              path,
              method,
              summary: details.summary || details.operationId || path,
              parameters: details.parameters || [],
              requestBody: details.requestBody,
              definitions: json.definitions || json.components?.schemas // Handle V2 and V3
            });
          }
        });
      });

      setParsedSpec({ info: json.info, endpoints });
      setError('');
      setActiveTab('manual');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setManualResponse(null);
    setFormData({});
  };

  const executeRequest = async (endpoint, data, isBatch = false) => {
    let url = config.baseUrl.replace(/\/$/, '') + endpoint.path;
    const options = {
      method: endpoint.method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...config.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})
      }
    };

    if (config.token) {
      options.headers['Authorization'] = `Bearer ${config.token}`;
    }

    // 1. Handle Path Parameters (e.g., /users/{id})
    if (endpoint.parameters) {
      endpoint.parameters.forEach(param => {
        if (param.in === 'path') {
          url = url.replace(`{${param.name}}`, data[param.name] || '');
        }
      });
    }

    // 2. Handle Query Parameters
    const queryParams = new URLSearchParams();
    if (endpoint.parameters) {
      endpoint.parameters.forEach(param => {
        if (param.in === 'query' && data[param.name]) {
          queryParams.append(param.name, data[param.name]);
        }
      });
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    // 3. Handle Body
    if (['post', 'put', 'patch'].includes(endpoint.method) && endpoint.requestBody) {
      // Very basic body construction: take all data keys that AREN'T path/query params
      const pathParams = endpoint.parameters?.map(p => p.name) || [];
      const bodyData = {};
      
      // If we parsed fields for the body, use them
      let bodyFields = [];
      const schema = endpoint.requestBody.content?.['application/json']?.schema;
      if (schema) {
         bodyFields = extractFieldsFromSchema(schema, endpoint.definitions).map(f => f.name);
      }

      Object.keys(data).forEach(key => {
        if (!pathParams.includes(key) && (bodyFields.length === 0 || bodyFields.includes(key))) {
          bodyData[key] = data[key];
        }
      });
      options.body = JSON.stringify(bodyData);
    }

    try {
      const start = Date.now();
      const res = await fetch(url, options);
      const time = Date.now() - start;
      
      let resBody;
      try {
        resBody = await res.json();
      } catch (e) {
        resBody = await res.text();
      }

      return {
        success: res.ok,
        status: res.status,
        time,
        data: resBody
      };
    } catch (err) {
      return {
        success: false,
        status: 0,
        time: 0,
        data: err.message, // Likely CORS or Network error
        isNetworkError: true
      };
    }
  };

  const runManualTest = async () => {
    if (!selectedEndpoint) return;
    setLoading(true);
    const result = await executeRequest(selectedEndpoint, formData);
    setManualResponse(result);
    setLoading(false);
  };

  const handleBatchUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBatchFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const data = parseCSV(text);
        setBatchData(data);
        setBatchResults([]);
      };
      reader.readAsText(file);
    }
  };
  
  const clearBatchData = () => {
    setBatchFile(null);
    setBatchData([]);
    setBatchResults([]);
    setBatchProgress(0);
    setBatchRunning(false);
  };

  const runBatchTest = async () => {
    if (!selectedEndpoint || batchData.length === 0) return;
    setBatchRunning(true);
    setBatchResults([]);
    
    let results = [];
    for (let i = 0; i < batchData.length; i++) {
      const row = batchData[i];
      const result = await executeRequest(selectedEndpoint, row, true);
      
      const resultRow = {
        _rowIndex: i + 1,
        ...row,
        _status: result.status,
        _success: result.success ? 'PASS' : 'FAIL',
        // NO TRUNCATION HERE - Storing full response
        _response: typeof result.data === 'object' ? JSON.stringify(result.data) : String(result.data)
      };
      
      results.push(resultRow);
      setBatchResults([...results]); // Update UI progressively
      setBatchProgress(Math.round(((i + 1) / batchData.length) * 100));
    }
    setBatchRunning(false);
  };

  const downloadBatchResults = () => {
    if (batchResults.length === 0) return;
    const headers = Object.keys(batchResults[0]);
    
    // Helper to escape CSV values safely for Excel/CSV readers
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      // If it contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
      if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`; 
      }
      return stringVal;
    };

    const csvContent = [
      headers.join(','),
      ...batchResults.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_results_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // --- RENDER HELPERS ---

  const UrlConfigInput = () => (
    <div className="bg-white p-2 px-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 mb-4 transition-shadow focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
      <div className="flex items-center gap-2 text-slate-500">
        <Globe size={16} />
        <span className="text-sm font-medium whitespace-nowrap">Base URL:</span>
      </div>
      <input
        type="text"
        className="flex-1 border-none focus:ring-0 text-sm font-mono text-slate-700 bg-transparent placeholder-slate-400 outline-none h-full py-1"
        placeholder="https://api.example.com"
        value={config.baseUrl}
        onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
      />
    </div>
  );

  const renderEndpointFields = (ep) => {
    const fields = [];

    // Path Params
    ep.parameters?.forEach(p => {
      fields.push({
        name: p.name,
        label: `${p.name} (Path)`,
        required: p.required || p.in === 'path', // Path params are effectively always required
        type: 'text',
        desc: p.description
      });
    });

    // Query Params
    ep.parameters?.forEach(p => {
      if (p.in === 'query') {
        fields.push({
          name: p.name,
          label: `${p.name} (Query)`,
          required: p.required || false,
          type: 'text',
          desc: p.description
        });
      }
    });

    // Body Fields (Simplified flat structure)
    if (['post', 'put', 'patch'].includes(ep.method) && ep.requestBody) {
      const schema = ep.requestBody.content?.['application/json']?.schema;
      if (schema) {
        const bodyFields = extractFieldsFromSchema(schema, ep.definitions);
        bodyFields.forEach(f => {
          fields.push({
            name: f.name,
            label: f.name,
            required: f.required,
            type: f.type === 'integer' ? 'number' : 'text',
            desc: f.description,
            isBody: true
          });
        });
      }
    }

    if (fields.length === 0) return <div className="text-slate-400 italic">No parameters required.</div>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-sm font-medium text-slate-700 flex items-center">
                {f.label}
                {f.required ? (
                   <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Required</span>
                ) : (
                   <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 uppercase tracking-wide">Optional</span>
                )}
              </label>
              {f.isBody && <span className="text-[10px] text-slate-400 font-mono">BODY</span>}
            </div>
            <input
              type={f.type}
              className={`w-full rounded-md border shadow-sm p-2 text-sm transition-colors ${f.required ? 'border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
              placeholder={f.desc || `Enter ${f.name}`}
              value={formData[f.name] || ''}
              onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
            />
            {f.desc && <p className="text-xs text-slate-500 mt-1 truncate" title={f.desc}>{f.desc}</p>}
          </div>
        ))}
      </div>
    );
  };

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Globe size={20} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            API EasyPortal
          </h1>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200">
            For QA & BA
          </span>
        </div>
        <div className="flex gap-2">
          {parsedSpec && (
            <>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Manual Test
              </button>
              <button 
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Batch Test
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'setup' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Settings size={16} /> Config
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        
        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="text-blue-500" />
                Step 1: Import API Spec
              </h2>
              <p className="text-slate-500 text-sm mb-4">
                Paste your Swagger/OpenAPI JSON content here. This defines the form fields for testing.
              </p>
              <textarea
                className="w-full h-48 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
              />
              {error && (
                <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={handleSpecParse}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  Parse Spec <ChevronRight size={16} />
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="text-blue-500" />
                Step 2: Environment Settings
              </h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    className="w-full rounded-md border-slate-300 border p-2 text-sm"
                    placeholder="https://api.myservice.com"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Auth Token (Optional)</label>
                  <input
                    type="password"
                    className="w-full rounded-md border-slate-300 border p-2 text-sm"
                    placeholder="Bearer eyJhbGci..."
                    value={config.token}
                    onChange={(e) => setConfig({...config, token: e.target.value})}
                  />
                  <p className="text-xs text-slate-400 mt-1">Will be added to Authorization header automatically.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* MANUAL TEST TAB */}
        {activeTab === 'manual' && parsedSpec && (
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Sidebar List */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <Card className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-700 mb-2">Endpoints</h3>
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                    <input 
                      type="text" 
                      placeholder="Search path..."
                      className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {parsedSpec.endpoints
                    .filter(ep => ep.path.toLowerCase().includes(manualSearch.toLowerCase()) || ep.summary.toLowerCase().includes(manualSearch.toLowerCase()))
                    .map(ep => (
                    <button
                      key={ep.id}
                      onClick={() => handleSelectEndpoint(ep)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${selectedEndpoint?.id === ep.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      <Badge method={ep.method} />
                      <span className="truncate text-slate-600 font-medium" title={ep.path}>{ep.path}</span>
                    </button>
                  ))}
                  {parsedSpec.endpoints.filter(ep => ep.path.toLowerCase().includes(manualSearch.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No endpoints found.</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Main Tester */}
            <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-6">
              <UrlConfigInput />
              {selectedEndpoint ? (
                <>
                  <Card className="p-6">
                    <div className="flex items-start justify-between mb-6 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <Badge method={selectedEndpoint.method} />
                          <h2 className="text-lg font-mono text-slate-800">{selectedEndpoint.path}</h2>
                        </div>
                        <p className="text-sm text-slate-500">{selectedEndpoint.summary}</p>
                      </div>
                      <button
                        onClick={runManualTest}
                        disabled={loading}
                        className={`px-6 py-2 rounded-md font-medium text-white shadow-sm flex items-center gap-2 ${loading ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {loading ? 'Sending...' : <><Play size={16} /> Send Request</>}
                      </button>
                    </div>

                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Parameters</h3>
                      {renderEndpointFields(selectedEndpoint)}
                    </div>
                  </Card>

                  {/* Response Area */}
                  {manualResponse && (
                    <Card className={`p-0 overflow-hidden border-l-4 ${manualResponse.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${manualResponse.success ? 'text-green-600' : 'text-red-600'}`}>
                            {manualResponse.status || 'ERR'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {manualResponse.time}ms
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">JSON</span>
                      </div>
                      <div className="p-4 bg-slate-900 overflow-auto max-h-96">
                         {manualResponse.isNetworkError && (
                           <div className="mb-4 p-3 bg-yellow-900/30 text-yellow-200 text-sm rounded border border-yellow-700">
                             <p className="font-bold flex items-center gap-2"><AlertCircle size={14}/> CORS / Network Error</p>
                             <p className="mt-1 opacity-80">
                               The browser blocked this request. Ensure the API supports CORS or use a browser extension to bypass CORS restrictions for testing.
                             </p>
                           </div>
                         )}
                         <pre className="text-green-400 font-mono text-xs">
                           {typeof manualResponse.data === 'object' ? JSON.stringify(manualResponse.data, null, 2) : manualResponse.data}
                         </pre>
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <ChevronDown size={32} className="text-slate-300" />
                  </div>
                  <p>Select an endpoint from the sidebar to start testing.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BATCH TEST TAB */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Batch Testing Runner</h2>
                  <p className="text-slate-500">Run multiple test cases sequentially from a CSV file.</p>
                </div>
                {selectedEndpoint && (
                   <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase font-bold">Target:</span>
                      <Badge method={selectedEndpoint.method} />
                      <span className="font-mono text-sm">{selectedEndpoint.path}</span>
                   </div>
                )}
             </div>

             <UrlConfigInput />

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="md:col-span-1 space-y-6">
                   <Card className="p-6">
                      <h3 className="font-semibold mb-4 text-slate-700">1. Select Endpoint</h3>
                      <div className="mb-4">
                        <SearchableSelect
                          options={parsedSpec?.endpoints.map(ep => ({
                            value: ep.id,
                            label: ep.path,
                            subLabel: ep.summary,
                            method: ep.method
                          })) || []}
                          value={selectedEndpoint?.id}
                          onChange={(id) => handleSelectEndpoint(parsedSpec.endpoints.find(ep => ep.id === id))}
                        />
                      </div>

                      <h3 className="font-semibold mb-4 text-slate-700 flex justify-between items-center">
                         <span>2. Upload Data</span>
                         {batchData.length > 0 && (
                            <button 
                               onClick={clearBatchData} 
                               className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                               <Trash2 size={12}/> Clear
                            </button>
                         )}
                      </h3>
                      
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                        <input 
                          type="file" 
                          accept=".csv"
                          onChange={handleBatchUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="transition-opacity group-hover:opacity-70">
                          <Upload className="mx-auto text-slate-400 mb-2" />
                          <p className="text-sm font-medium text-slate-600">
                            {batchFile ? batchFile.name : "Click to upload CSV"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Headers must match param names</p>
                        </div>
                      </div>

                      {batchData.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex justify-between items-center">
                          <span>Loaded <strong>{batchData.length}</strong> rows.</span>
                          <CheckCircle size={16} className="text-blue-500" />
                        </div>
                      )}
                   </Card>

                   <button
                     onClick={runBatchTest}
                     disabled={!selectedEndpoint || batchData.length === 0 || batchRunning}
                     className={`w-full py-3 rounded-lg font-bold shadow-sm transition-all text-white flex justify-center items-center gap-2
                       ${!selectedEndpoint || batchData.length === 0 
                          ? 'bg-slate-300 cursor-not-allowed' 
                          : batchRunning ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5'
                       }`}
                   >
                     {batchRunning ? 'Running...' : 'Start Batch Run'}
                   </button>
                </div>

                {/* Results Panel */}
                <div className="md:col-span-2">
                  <Card className="h-full min-h-[500px] flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                       <h3 className="font-semibold text-slate-700">Results Console</h3>
                       {batchResults.length > 0 && !batchRunning && (
                         <button 
                           onClick={downloadBatchResults}
                           className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                         >
                           <Download size={14} /> Download CSV
                         </button>
                       )}
                    </div>

                    {/* Progress Bar */}
                    {batchRunning && (
                      <div className="w-full bg-slate-200 h-1">
                        <div 
                          className="bg-blue-600 h-1 transition-all duration-300" 
                          style={{ width: `${batchProgress}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="flex-1 overflow-auto p-0">
                      {batchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                          <FileText size={48} className="mb-4" />
                          <p>Results will appear here</p>
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                              <th className="p-3 font-medium">#</th>
                              <th className="p-3 font-medium">Status</th>
                              <th className="p-3 font-medium">Result</th>
                              <th className="p-3 font-medium">Data Preview</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {batchResults.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-500">{row._rowIndex}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${row._status >= 200 && row._status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {row._status || 'ERR'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-mono text-xs max-w-xs truncate" title={row._response}>
                                  {row._response}
                                </td>
                                <td className="p-3 text-slate-400 text-xs">
                                  {Object.keys(row).filter(k => !k.startsWith('_')).map(k => `${k}:${row[k]}`).join(', ').slice(0, 30)}...
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </Card>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}