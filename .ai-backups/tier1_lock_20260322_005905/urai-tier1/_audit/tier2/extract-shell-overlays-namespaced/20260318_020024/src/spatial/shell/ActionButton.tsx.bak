"use client";

import React from "react";

export function ActionButton(input: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={input.onClick}
      disabled={input.disabled}
      style={{
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: input.disabled ? "rgba(255,255,255,0.06)" : "rgba(12,18,34,0.94)",
        color: input.disabled ? "rgba(240,244,255,0.42)" : "rgba(240,244,255,0.94)",
        padding: "10px 13px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: input.disabled ? "not-allowed" : "pointer",
      }}
    >
      {input.label}
    </button>
  );
}

function Tag(input: { value: string }) {
  return (
    <div
      style={{
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.05)",
        padding: "6px 9px",
        fontSize: 10,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "rgba(220,228,245,0.86)",
      }}
    >
      {input.value}
    </div>
  );
}

function ReplayDatum(input: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(204,216,245,0.58)",
          marginBottom: 6,
        }}
      >
        {input.label}
      </div>
      <div style={{ fontSize: 12, color: "rgba(235,241,255,0.90)" }}>{input.value}</div>
    </div>
  );
}
