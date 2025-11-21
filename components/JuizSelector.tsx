
import React, { useState, useEffect } from 'react';
import { Juiz } from '../types';

interface JuizSelectorProps {
  id: string;
  label: string;
  juizes: Juiz[];
  value: string;
  onChange: (value: string) => void;
}

const JuizSelector: React.FC<JuizSelectorProps> = ({ id, label, juizes, value, onChange }) => {
  const safeJuizes = juizes || [];
  const isManual = !safeJuizes.some(p => p.nome === value) && value !== '';
  const [manualMode, setManualMode] = useState(isManual);
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    if (value === '' || safeJuizes.some(p => p.nome === value)) {
      setManualMode(false);
    }
    setSelectedValue(value);
  }, [value, safeJuizes]);

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
        <option value="">Selecione um juiz</option>
        {safeJuizes.map((juiz) => (
          <option key={juiz.id} value={juiz.nome}>{juiz.nome}</option>
        ))}
        <option value="manual">✏️ Inserir manualmente</option>
      </select>
      {manualMode && (
        <div className="mt-2">
           <label htmlFor={`${id}-manual`} className="block text-sm font-medium text-gray-500">Digite o nome do juiz:</label>
          <input
            type="text"
            id={`${id}-manual`}
            value={value}
            onChange={handleInputChange}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
            placeholder="Nome completo do juiz"
          />
        </div>
      )}
    </div>
  );
};

export default JuizSelector;