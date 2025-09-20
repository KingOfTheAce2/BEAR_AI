import React, { useState } from 'react';
import {
import { QuickAction } from '../../types';

  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ScaleIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
}

const quickActions: QuickAction[] = [
  {
    id: 'contract-analysis',
    label: 'Contract Analysis',
    description: 'Analyze contracts for risks and compliance',
    icon: 'DocumentTextIcon',
    category: 'analysis',
    prompt: 'Please help me analyze a contract. I need you to review it for potential risks, liability issues, and compliance requirements.'
  },
  {
    id: 'legal-research',
    label: 'Legal Research',
    description: 'Research case law and statutes',
    icon: 'MagnifyingGlassIcon',
    category: 'research',
    prompt: 'I need legal research assistance. Please help me find relevant case law, statutes, and precedents for my case.'
  },
  {
    id: 'document-draft',
    label: 'Document Drafting',
    description: 'Draft legal documents and briefs',
    icon: 'PencilSquareIcon',
    category: 'drafting',
    prompt: 'I need help drafting a legal document. Please assist me with creating a professional legal brief or contract.'
  },
  {
    id: 'compliance-check',
    label: 'Compliance Review',
    description: 'Review compliance requirements',
    icon: 'CheckCircleIcon',
    category: 'review',
    prompt: 'I need to review compliance requirements for my organization. Please help me identify relevant regulations and requirements.'
  },
  {
    id: 'case-law-search',
    label: 'Case Law Search',
    description: 'Search for relevant precedents',
    icon: 'ScaleIcon',
    category: 'research',
    prompt: 'Please help me search for relevant case law and precedents that might apply to my legal matter.'
  },
  {
    id: 'statute-lookup',
    label: 'Statute Lookup',
    description: 'Find and interpret statutes',
    icon: 'BookOpenIcon',
    category: 'research',
    prompt: 'I need help finding and interpreting relevant statutes and regulations for my legal issue.'
  },
  {
    id: 'brief-outline',
    label: 'Brief Outline',
    description: 'Create legal brief structure',
    icon: 'ClipboardDocumentListIcon',
    category: 'drafting',
    prompt: 'Please help me create an outline for a legal brief, including all necessary sections and arguments.'
  },
  {
    id: 'damages-calculation',
    label: 'Damages Analysis',
    description: 'Calculate potential damages',
    icon: 'BanknotesIcon',
    category: 'analysis',
    prompt: 'I need help analyzing and calculating potential damages for a legal case. Please assist with damage assessment.'
  }
];

const getIconComponent = (iconName: string) => {
  const iconMap = {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    PencilSquareIcon,
    CheckCircleIcon,
    ScaleIcon,
    BookOpenIcon,
    ClipboardDocumentListIcon,
    BanknotesIcon
  };
  
  return iconMap[iconName as keyof typeof iconMap] || DocumentTextIcon;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'research':
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    case 'analysis':
      return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
    case 'drafting':
      return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
    case 'review':
      return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  }
};

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const categories = ['all', 'research', 'analysis', 'drafting', 'review'];
  
  const filteredActions = selectedCategory === 'all' 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory);

  const displayedActions = showAll ? filteredActions : filteredActions.slice(0, 4);

  return (
    <div className="space-y-3">
      {/* Category Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Quick Actions:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200 whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-bear-navy text-white border-bear-navy'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {displayedActions.map((action) => {
          const IconComponent = getIconComponent(action.icon);
          
          return (
            <button
              key={action.id}
              onClick={() => onActionClick(action.prompt)}
              className={`
                flex flex-col items-center space-y-2 p-3 rounded-lg border text-center
                transition-all duration-200 hover:shadow-sm
                ${getCategoryColor(action.category)}
              `}
              title={action.description}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="text-xs font-medium line-clamp-2">
                  {action.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {filteredActions.length > 4 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-bear-navy hover:text-bear-green font-medium transition-colors duration-200"
          >
            {showAll ? 'Show Less' : `Show ${filteredActions.length - 4} More`}
          </button>
        </div>
      )}

      {/* Custom Action Suggestion */}
      <div className="pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center">
          Not seeing what you need? Just type your legal question or request directly.
        </div>
      </div>
    </div>
  );
};