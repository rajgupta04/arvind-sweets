import React from "react";

/**
 * OrderStatusTracker
 * Props:
 *  - currentStatus: string (e.g. "Placed", "Preparing", "Out for Delivery", "Delivered", "Cancelled")
 *
 * This component will:
 *  - Normalize incoming status (case-insensitive)
 *  - Fill the connector line up to the current step
 *  - Mark completed steps with orange background and text
 *  - Show red cancelled message when status === "cancelled"
 *
 * Styling uses Tailwind classes.
 */

const steps = [
  { id: 1, label: "Placed", value: "placed" },
  { id: 2, label: "Preparing", value: "preparing" },
  { id: 3, label: "Out for Delivery", value: "out for delivery" },
  { id: 4, label: "Delivered", value: "delivered" },
];

export default function OrderStatusTracker({ currentStatus }) {
  const normalize = (raw) => {
    const v = (raw || "").toString().toLowerCase().trim();
    if (!v) return "placed";
    if (v === "cancelled" || v === "canceled") return "cancelled";
    if (v === "processing") return "preparing";
    if (v === "pending") return "placed";
    if (v.includes("out") && v.includes("delivery")) return "out for delivery";
    return v;
  };

  const normalized = normalize(currentStatus);

  // Cancelled — show special UI (keep it compact; parent usually provides the card)
  if (normalized === "cancelled") {
    return (
      <div className="flex items-start gap-3">
        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-red-600">Order Cancelled</p>
          <p className="text-xs text-gray-600 mt-1">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  // Find current step index (0-based). If unknown, show first step as current.
  const rawIndex = steps.findIndex((s) => s.value === normalized);
  const currentIndex = rawIndex >= 0 ? rawIndex : 0;

  // Compute fill percentage for the progress line
  const fillPercent = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="relative w-full">
      <div className="absolute left-0 right-0 top-4 sm:top-5 h-1 bg-gray-200 rounded" aria-hidden />
      <div
        className="absolute left-0 top-4 sm:top-5 h-1 bg-orange-600 rounded transition-all duration-300"
        style={{ width: `${fillPercent}%` }}
        aria-hidden
      />

      <div className="relative z-10 flex items-start justify-between">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDelivered = normalized === 'delivered';
          const isCompleted = index < currentIndex;
          const showCheck = isCompleted || (isDelivered && isCurrent);

          const circleBase = "flex items-center justify-center rounded-full border transition-colors";
          const circleSize = "w-8 h-8 sm:w-9 sm:h-9";
          const circleState = isCurrent || isCompleted
            ? "bg-orange-600 border-orange-600 text-white"
            : "bg-white border-gray-300 text-gray-400";

          const labelState = isCompleted || isCurrent ? "text-gray-900" : "text-gray-400";

          return (
            <div key={step.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
              <div
                className={`${circleBase} ${circleSize} ${circleState}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="text-sm font-semibold">{showCheck ? "✓" : step.id}</span>
              </div>
              <div className={`mt-2 text-[11px] sm:text-xs font-medium text-center ${labelState}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
