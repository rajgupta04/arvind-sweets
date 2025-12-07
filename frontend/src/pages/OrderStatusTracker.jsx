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
 * Styling uses Tailwind classes; adjust colors/sizes as needed.
 */

const steps = [
  { id: 1, label: "Placed", value: "placed" },
  { id: 2, label: "Preparing", value: "preparing" },
  { id: 3, label: "Out for Delivery", value: "out for delivery" },
  { id: 4, label: "Delivered", value: "delivered" },
];

export default function OrderStatusTracker({ currentStatus }) {
  // Normalize input: convert to lowercase string
  const normalized = (currentStatus || "").toString().toLowerCase().trim();

  // If cancelled — show special UI
  if (normalized === "cancelled") {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <h3 className="text-lg font-semibold text-red-600">Order Cancelled</h3>
        </div>
        <p className="mt-3 text-sm text-gray-600">This order has been cancelled.</p>
      </div>
    );
  }

  // Find the current step index (0-based). If not found, will be -1 meaning nothing completed.
  const currentIndex = steps.findIndex((s) => s.value === normalized);

  // Compute fill percentage for the progress line
  const fillPercent =
    currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      {/* The small title is optional here - keep in parent if you want different layout */}
      {/* <h3 className="text-lg font-semibold mb-4">Order Status</h3> */}

      <div className="relative w-full px-2 py-4">
        {/* Background line */}
        <div className="absolute left-4 right-4 top-6 h-1 bg-gray-200 rounded" />

        {/* Filled progress line */}
        <div
          className="absolute left-4 top-6 h-1 bg-orange-600 rounded transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />

        {/* Step circles */}
        <div className="flex justify-between items-center relative z-10">
          {steps.map((step, index) => {
            const isCompleted = index <= currentIndex && currentIndex !== -1;
            const circleClasses = isCompleted
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-gray-100 text-gray-600 border-gray-300";

            return (
              <div key={step.id} className="flex flex-col items-center w-1/4">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${circleClasses}`}
                  aria-current={isCompleted ? "true" : "false"}
                >
                  <span className="text-sm font-semibold">{step.id}</span>
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs ${
                      isCompleted ? "text-orange-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
