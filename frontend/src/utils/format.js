export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getStageColor(stage) {
  const colors = {
    prospecting: 'bg-gray-100 text-gray-700',
    qualification: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700',
    negotiation: 'bg-amber-100 text-amber-700',
    closed_won: 'bg-green-100 text-green-700',
    closed_lost: 'bg-red-100 text-red-700',
  };
  return colors[stage] || 'bg-gray-100 text-gray-700';
}

export function getStageName(stage) {
  const names = {
    prospecting: 'Prospecting',
    qualification: 'Qualification',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };
  return names[stage] || stage;
}

export function getHealthColor(health) {
  const colors = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    at_risk: 'bg-amber-100 text-amber-700',
    churned: 'bg-red-100 text-red-700',
  };
  return colors[health] || 'bg-gray-100 text-gray-700';
}

export function getPriorityColor(priority) {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
}

export function getActivityIcon(type) {
  const icons = {
    call: '📞',
    email: '✉️',
    meeting: '🤝',
    note: '📝',
    task: '✅',
  };
  return icons[type] || '📋';
}
