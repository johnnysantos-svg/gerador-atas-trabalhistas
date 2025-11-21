
import React from 'react';
import { AtaData } from '../types';
import { generateAtaHtml } from '../ata-generator';

interface PreviewProps {
  data: AtaData;
}

const Preview: React.FC<PreviewProps> = ({ data }) => {
  const generatedHtml = generateAtaHtml(data);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[calc(100vh-10rem)] overflow-y-auto">
      <div 
        className="max-w-none font-serif"
        dangerouslySetInnerHTML={{ __html: generatedHtml }}
      />
    </div>
  );
};

export default Preview;
