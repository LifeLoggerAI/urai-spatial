"use client";

type BatchImportAuditOverlayProps = {
items?: Array<{ id: string; label: string; status: string }>;
};

export function BatchImportAuditOverlay({ items = [] }: BatchImportAuditOverlayProps) {
if (!items.length) return null;

return ( <div> <h3>Batch Import Audit</h3> <ul>
{items.map((item) => ( <li key={item.id}> <strong>{item.label}</strong> <span> {item.status}</span> </li>
))} </ul> </div>
);
}

export default BatchImportAuditOverlay;
