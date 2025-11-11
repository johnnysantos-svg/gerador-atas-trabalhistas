
import React from 'react';
import { AtaData } from '../types';
import { generateAtaHtml } from '../ata-generator';

interface PreviewProps {
  data: AtaData;
}

const Preview: React.FC<PreviewProps> = ({ data }) => {
  const generatedHtml = generateAtaHtml(data);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full overflow-y-auto">
      <div 
        className="prose prose-sm max-w-none font-serif"
        dangerouslySetInnerHTML={{ __html: generatedHtml }}
      />
    </div>
  );
};

export default Preview;
