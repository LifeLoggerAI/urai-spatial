# 🧬 STAR CLASSIFICATION MODEL (Visual System)

**Principle:** Stars are not random points; they are semantic memory nodes. Their visual properties are a direct mapping of their underlying data, turning the sky into psychological cartography.

---

### 🌟 Memory Node Schema

This is the core data structure for each star. It will be stored in Firestore and enriched by a cloud function before being sent to the client.

```json
{
  "id": "<unique_node_id>",
  "timestamp": <unix_timestamp>,
  "emotionalScore": <float, -1 to 1>,
  "significanceScore": <float, 0 to 1>,
  "traumaScore": <float, 0 to 1>,
  "recoveryScore": <float, 0 to 1>,
  "socialDensity": <float, 0 to 1>,
  "category": "<string>", // e.g., "work", "relationship", "personal_growth"
  "ritualTag": "<string>" // e.g., "birthday", "anniversary"
}
```

### 🎨 Visual Mapping

The enriched data from the schema is mapped to visual properties in the shaders.

| Data Field          | Visual Property        | Implementation Details                                                                                                 |
| ------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `emotionalScore`    | **Color Temperature**  | Passed as a `color` attribute to the star's vertex shader. `-1` maps to cool blue, `0` to white, `+1` to warm gold.   |
| `significanceScore` | **Size & Glow**        | Multiplies the base `gl_PointSize` in the vertex shader. Also influences the intensity of the bloom effect.            |
| `traumaScore`       | **Haze & Instability** | If > 0.5, a small, localized blue haze (a transparent sprite) is rendered behind the star. A subtle flicker is added. |
| `recoveryScore`     | **Pulsing Halo**       | If > 0.5, triggers an animated, expanding ring or a gently pulsing aura halo around the star.                       |
| `socialDensity`     | **Constellation Lines**| If > 0.5 for a group of stars in a similar time period, faint lines are dynamically drawn between them.             |
| `ritualTag`         | **Symbol Glyph**       | If present, a subtle, low-opacity symbol (e.g., a simple ring for an anniversary) is overlaid on the star.         |

### ✨ Example Visual States

*   **A Neutral Memory:** A small, simple white dot. The most common star type.
*   **An Emotional Spike:** A larger, brighter star with a distinct warm (joy) or cool (sadness) color.
*   **A Trauma Period:** A cluster of dim, blue-tinted stars with a subtle, shimmering haze around them.
*   **A Recovery Bloom:** A star that is actively pulsing with a soft, warm, expanding light, indicating a period of significant positive growth.
*   **A Relationship Cluster:** A group of stars connected by faint, glowing lines, representing a dense period of social interaction.
