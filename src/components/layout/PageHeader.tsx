import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center">
        {icon && (
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="mt-4 flex flex-shrink-0 sm:mt-0 sm:ml-4">{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;
