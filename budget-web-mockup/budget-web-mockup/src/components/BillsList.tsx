import { Bill } from '@/lib/mockData';

interface BillsListProps {
  bills: Bill[];
}

export default function BillsList({ bills }: BillsListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PAID: 'text-green-600 bg-green-100',
      UPCOMING: 'text-blue-600 bg-blue-100',
      OVERDUE: 'text-red-600 bg-red-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getDaysUntilDue = (dateStr: string) => {
    const today = new Date();
    const dueDate = new Date(dateStr);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {bills.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No bills found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {bills.map((bill) => (
            <div key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: bill.category.color }}
                  >
                    <span className="text-lg">{bill.category.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{bill.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {bill.category.name} • {bill.recurrence}
                      </p>
                      <span className="text-xs text-gray-500">
                        • {getDaysUntilDue(bill.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(bill.amount)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(bill.dueDate)}</p>
                    </div>
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      getStatusColor(bill.status)
                    }`}>
                      {bill.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}