import { Heart, Car, Landmark } from 'lucide-react';
import { InsuranceType } from './types';

interface InsuranceTypeToggleProps {
  insuranceType: InsuranceType;
  onTypeChange: (type: InsuranceType) => void;
}

export function InsuranceTypeToggle({ insuranceType, onTypeChange }: InsuranceTypeToggleProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/40">
      <span className="text-sm font-medium text-muted-foreground">Insurance Type:</span>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onTypeChange('life')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            insuranceType === 'life'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Heart className="h-4 w-4" />
          Life Insurance
        </button>
        <button
          onClick={() => onTypeChange('nonlife')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            insuranceType === 'nonlife'
              ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-sm'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Car className="h-4 w-4" />
          Non-Life Insurance
        </button>
        <button
          onClick={() => onTypeChange('pension')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            insuranceType === 'pension'
              ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Landmark className="h-4 w-4" />
          Pension Funds
        </button>
      </div>
    </div>
  );
}
