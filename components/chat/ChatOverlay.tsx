"use client"

export default function ChatOverlay({ close }: { close: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "40%",
        background: "#111",
        color: "white",
        padding: "20px",
      }}
    >
      <h2>Orb Chat</h2>
      <p>This is the chat window.</p>
      <button onClick={close}>Close</button>
    </div>
  )
}
