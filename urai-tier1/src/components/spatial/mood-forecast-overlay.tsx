import type { MoodForecast } from "@/lib/firebase/firebaseSpatialSchema";

type Props = { forecast: MoodForecast };

export function MoodForecastOverlay({ forecast }: Props) {
  return (
    <aside className="forecast" aria-label="Mood forecast overlay">
      <span>Forecast</span>
      <strong>{forecast.forecastMood}</strong>
      <small>{Math.round(forecast.confidence * 100)}% confidence · {forecast.visual.skyShift}</small>
      <style jsx>{`.forecast{position:absolute;right:1rem;top:1rem;z-index:9;display:grid;gap:.1rem;padding:.75rem .9rem;border:1px solid rgba(180,230,255,.18);border-radius:1rem;background:rgba(4,14,28,.42);backdrop-filter:blur(14px);color:#dff7ff}.forecast span{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:#91cce3}.forecast strong{text-transform:capitalize}.forecast small{color:#aacedd}@media(max-width:640px){.forecast{left:1rem;right:auto;top:1rem;max-width:13rem}}`}</style>
    </aside>
  );
}
