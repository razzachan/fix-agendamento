
import React from 'react';
import { ImageIcon } from 'lucide-react';

interface AddImageButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const AddImageButton: React.FC<AddImageButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-2 border-dashed border-muted-foreground/20 rounded-md flex flex-col items-center justify-center aspect-square hover:bg-accent/30 transition-colors"
      disabled={disabled}
      aria-label="Adicionar imagem"
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
    </button>
  );
};

export default AddImageButton;
