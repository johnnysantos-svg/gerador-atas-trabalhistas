
import React, { useState, useEffect } from 'react';
import { Perito } from '../types';

interface PeritoSelectorProps {
  id: string;
  label: string;
  peritos: Perito[];
  value: string;
  onChange: (value: string) => void;
}

const PeritoSelector: React.FC<PeritoSelectorProps> = ({ id, label, peritos, value, onChange }) => {
  const safePeritos = peritos || [];
  const isManual = !safePeritos.some(p => p.nome === value) && value !== '';
  const [manualMode, setManualMode] = useState(isManual);
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    if (value === '' || safePeritos.some(p => p.nome === value)) {
      setManualMode(false);
    }
    setSelectedValue(value);
  }, [value, safePeritos]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'manual') {
      setManualMode(true);
      onChange('');
    } else {
      setManualMode(false);
      onChange(val);
    }
    setSelectedValue(val);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setSelectedValue('manual');
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        id={id}
        value={manualMode ? 'manual' : selectedValue}
        onChange={handleSelectChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
      >
        <option value="">Selecione um perito</option>
        {safePeritos.map((perito) => (
          <option key={perito.id} value={perito.nome}>{perito.nome}</option>
        ))}
        <option value="manual">✏️ Inserir manualmente</option>
      </select>
      {manualMode && (
        <div className="mt-2">
           <label htmlFor={`${id}-manual`} className="block text-sm font-medium text-gray-500">Digite o nome do perito:</label>
          <input
            type="text"
            id={`${id}-manual`}
            value={value}
            onChange={handleInputChange}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
            placeholder="Nome completo do perito"
          />
        </div>
      )}
    </div>
  );
};

export default PeritoSelector;