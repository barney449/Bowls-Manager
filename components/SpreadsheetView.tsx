import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Download, RefreshCw, Search, Filter } from 'lucide-react';

interface SpreadsheetViewProps {
  data: any[];
  onSave: (newData: any[]) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({ data, onSave, onRefresh, isLoading }) => {
  const [localData, setLocalData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      setLocalData(data);
      // Extract unique keys from all objects to form columns
      const allKeys = new Set<string>();
      data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      setColumns(Array.from(allKeys));
    } else {
      setLocalData([]);
      setColumns(['id', 'name', 'value']); // Default columns for empty state
    }
  }, [data]);

  // Auto-save logic
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      onSave(localData);
      setHasChanges(false);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [localData, hasChanges, onSave]);

  const handleCellChange = (rowIndex: number, column: string, value: any) => {
    const newData = [...localData];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setLocalData(newData);
    setHasChanges(true);
  };

  const addRow = () => {
    const newRow: any = { id: `row-${Date.now()}` };
    columns.forEach(col => {
      if (col !== 'id') newRow[col] = '';
    });
    setLocalData([...localData, newRow]);
    setHasChanges(true);
  };

  const removeRow = (index: number) => {
    const newData = localData.filter((_, i) => i !== index);
    setLocalData(newData);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localData);
  };

  const exportToCSV = () => {
    if (localData.length === 0) return;
    
    const headers = columns.join(',');
    const rows = localData.map(row => 
      columns.map(col => {
        const val = row[col] === undefined || row[col] === null ? '' : row[col];
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'database_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = localData.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search database..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-50"
            title="Refresh from GitHub"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm transition-all shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save to GitHub
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="w-12 p-2 border-r border-slate-300 text-slate-500 font-mono text-[10px] uppercase">#</th>
              {columns.map(col => (
                <th key={col} className="p-2 border-r border-slate-300 text-left text-slate-700 font-semibold min-w-[150px]">
                  {col}
                </th>
              ))}
              <th className="w-12 p-2 text-center text-slate-500 font-mono text-[10px] uppercase">Del</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono text-xs bg-slate-50/50">
                  {rowIndex + 1}
                </td>
                {columns.map(col => (
                  <td key={col} className="p-0 border-r border-slate-200">
                    <input
                      type="text"
                      className="w-full p-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 outline-none"
                      value={row[col] === undefined || row[col] === null ? '' : row[col]}
                      onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-2 text-center">
                  <button 
                    onClick={() => removeRow(rowIndex)}
                    className="text-slate-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="p-12 text-center text-slate-400 italic">
                  No data found. Add a row to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Status */}
      <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
        <div className="flex gap-4">
          <div>Rows: {filteredData.length}</div>
          {hasChanges && <div className="text-amber-600 font-bold animate-pulse">Auto-saving...</div>}
        </div>
        <div>GitHub Sync: {isLoading ? 'Syncing...' : 'Connected'}</div>
      </div>
    </div>
  );
};

export default SpreadsheetView;
