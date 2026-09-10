export const DEFAULT_CATEGORIES = [
  { name: "Groceries", icon: "🛒", color: "#22c55e" },
  { name: "Dining", icon: "🍽️", color: "#f97316" },
  { name: "Transport", icon: "🚗", color: "#3b82f6" },
  { name: "Housing", icon: "🏠", color: "#8b5cf6" },
  { name: "Utilities", icon: "💡", color: "#eab308" },
  { name: "Entertainment", icon: "🎬", color: "#ec4899" },
  { name: "Shopping", icon: "🛍️", color: "#14b8a6" },
  { name: "Health", icon: "❤️", color: "#ef4444" },
  { name: "Travel", icon: "✈️", color: "#06b6d4" },
  { name: "Salary", icon: "💰", color: "#10b981" },
  { name: "Freelance", icon: "💼", color: "#6366f1" },
  { name: "Transfer", icon: "🔄", color: "#64748b" },
  { name: "Other", icon: "📦", color: "#94a3b8" },
] as const;

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
] as const;
