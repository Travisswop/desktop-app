// app/components/GroupMenu.js
"use client";
import { useState } from "react";

export default function GroupMenu({ group, socket, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: "👥 Add Member",
      action: () => console.log("Add member"),
      color: "default",
    },
    {
      label: "👤 Remove Member",
      action: () => console.log("Remove member"),
      color: "default",
    },
    {
      label: "✏️ Edit Group",
      action: () => console.log("Edit group"),
      color: "default",
    },
    {
      label: "🤖 Add Bot",
      action: () => console.log("Add bot"),
      color: "default",
    },
    {
      label: "🚪 Leave Group",
      action: () => console.log("Leave group"),
      color: "warning",
    },
    {
      label: "🗑️ Delete Group",
      action: () => console.log("Delete group"),
      color: "danger",
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-whatsapp-hover transition-colors"
      >
        ⋮
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 bg-whatsapp-bg-secondary border border-whatsapp-border rounded-lg shadow-lg z-50 min-w-48">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 border-b border-whatsapp-border last:border-b-0 transition-colors ${
                  item.color === "danger"
                    ? "text-red-400 hover:bg-red-500 hover:bg-opacity-10"
                    : item.color === "warning"
                    ? "text-orange-400 hover:bg-orange-500 hover:bg-opacity-10"
                    : "text-whatsapp-text-primary hover:bg-whatsapp-hover"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
