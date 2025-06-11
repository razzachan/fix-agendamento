
import React from 'react';
import { Package, Search } from 'lucide-react';

interface CompositePackageIconProps {
  className?: string;
}

const CompositePackageIcon: React.FC<CompositePackageIconProps> = ({ className = "mb-2" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Package className="h-6 w-6" />
      <Search className="h-4 w-4 -ml-2" />
    </div>
  );
};

export default CompositePackageIcon;
