// Business Industry Templates
// Defines the KPIs and Data Structures for different business types

export const industryTemplates = {
  saas: {
    id: 'saas',
    label: 'SaaS',
    kpis: [
      { id: 'mrr', label: 'Monthly Recurring Revenue', format: 'currency' },
      { id: 'subscribers', label: 'Active Subscribers', format: 'number' },
      { id: 'churn', label: 'Churn Rate', format: 'percent' },
      { id: 'ltv', label: 'Lifetime Value', format: 'currency' }
    ],
    crmStages: ['Lead', 'Trial', 'Customer'],
    agents: ['Marketing Agent', 'Growth Agent', 'SaaS Retention Agent']
  },
  ecommerce: {
    id: 'ecommerce',
    label: 'E-commerce',
    kpis: [
      { id: 'revenue', label: 'Total Revenue', format: 'currency' },
      { id: 'orders', label: 'Total Orders', format: 'number' },
      { id: 'aov', label: 'Average Order Value', format: 'currency' },
      { id: 'roas', label: 'Return on Ad Spend', format: 'multiplier' }
    ],
    crmStages: ['Abandoned Cart', 'Purchased', 'Repeat Customer'],
    agents: ['Marketing Agent', 'Advertising Agent', 'E-commerce Growth Agent']
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    kpis: [
      { id: 'reservations', label: 'Reservations', format: 'number' },
      { id: 'revenue', label: 'Revenue', format: 'currency' },
      { id: 'foot_traffic', label: 'Foot Traffic', format: 'number' },
      { id: 'reviews', label: 'New Reviews', format: 'number' }
    ],
    crmStages: ['Lead', 'Reservation Made', 'Dined'],
    agents: ['Marketing Agent', 'Reputation Agent', 'Local Growth Agent']
  },
  dental: {
    id: 'dental',
    label: 'Dental Clinic',
    kpis: [
      { id: 'new_patients', label: 'New Patients', format: 'number' },
      { id: 'appointments', label: 'Appointments Booked', format: 'number' },
      { id: 'treatment_value', label: 'Treatment Value', format: 'currency' },
      { id: 'retention', label: 'Patient Retention', format: 'percent' }
    ],
    crmStages: ['Lead', 'Consultation Booked', 'Treatment Accepted'],
    agents: ['Marketing Agent', 'Reputation Agent', 'Patient Acquisition Agent']
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real Estate',
    kpis: [
      { id: 'leads', label: 'New Leads', format: 'number' },
      { id: 'viewings', label: 'Property Viewings', format: 'number' },
      { id: 'closings', label: 'Closings', format: 'number' },
      { id: 'revenue', label: 'Commission Revenue', format: 'currency' }
    ],
    crmStages: ['Lead', 'Viewing Scheduled', 'Offer Submitted', 'Closed'],
    agents: ['Marketing Agent', 'Advertising Agent', 'Real Estate Growth Agent']
  },
  generic: {
    id: 'generic',
    label: 'General Business',
    kpis: [
      { id: 'revenue', label: 'Total Revenue', format: 'currency' },
      { id: 'customers', label: 'Customers', format: 'number' },
      { id: 'leads', label: 'New Leads', format: 'number' },
      { id: 'conversion_rate', label: 'Conversion Rate', format: 'percent' }
    ],
    crmStages: ['Lead', 'Contacted', 'Won'],
    agents: ['Marketing Agent', 'Growth Agent', 'Analytics Agent']
  }
};

export function getTemplateForBusiness(businessType) {
  return industryTemplates[businessType] || industryTemplates.generic;
}

export function formatMetric(value, format) {
  if (value === undefined || value === null) return '0';
  
  switch (format) {
    case 'currency':
      return '$' + value.toLocaleString();
    case 'percent':
      return value + '%';
    case 'multiplier':
      return value + 'x';
    case 'number':
    default:
      return value.toLocaleString();
  }
}
